'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const CLAIM_PATH = '/api/bridge/operations/claim';
const RESULT_PATH = '/api/bridge/operations';
const OPERATION_TYPES = new Set([
  'create_rooms',
  'create_channel',
  'create_role',
  'update_role',
  'set_channel_permissions',
]);
const SAFE_RETRY_TYPES = new Set(['update_role', 'set_channel_permissions']);
const MAX_CREATE_ROOMS_RESOURCES = 40;
const PERMISSION_BITS = Object.freeze({
  'View Channel': 1n << 10n,
  'Send Messages': 1n << 11n,
  'Manage Messages': 1n << 13n,
  'Manage Channels': 1n << 4n,
  'Manage Roles': 1n << 28n,
  Connect: 1n << 20n,
  Speak: 1n << 21n,
  'Mention Everyone': 1n << 17n,
  'Read Message History': 1n << 16n,
});
const OVERWRITE_PERMISSION_NAMES = Object.freeze({
  'View Channel': 'ViewChannel',
  'Send Messages': 'SendMessages',
  'Manage Messages': 'ManageMessages',
  'Manage Channels': 'ManageChannels',
  'Manage Roles': 'ManageRoles',
  Connect: 'Connect',
  Speak: 'Speak',
  'Mention Everyone': 'MentionEveryone',
  'Read Message History': 'ReadMessageHistory',
});
const SNOWFLAKE = /^\d{17,20}$/;
const OPERATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[a-f0-9]{64}$/i;
const DEFAULT_IDLE_POLL_MS = 2000;
const MIN_IDLE_POLL_MS = 1000;
const MAX_IDLE_POLL_MS = 10000;
const MAX_ERROR_BACKOFF_MS = 15000;
const CLAIM_TIMEOUT_MS = 10000;
const RESULT_TIMEOUT_MS = 10000;
const MAX_STATE_RECORDS = 5000;
const STATE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

class BridgeOperationError extends Error {
  constructor(code, summary, details = {}) {
    super(summary);
    this.name = 'BridgeOperationError';
    this.code = code;
    this.summary = summary;
    this.details = details;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength || /[\u0000-\u001f\u007f]/.test(cleaned)) return null;
  return cleaned;
}

function validBridgeSecret(value) {
  return typeof value === 'string' && /^[a-f0-9]{64,}$/i.test(value);
}

function validOperationId(value) {
  return typeof value === 'string' && OPERATION_ID.test(value);
}

function validIdempotencyKey(value) {
  return typeof value === 'string' && IDEMPOTENCY_KEY.test(value);
}

function validSnowflake(value) {
  return typeof value === 'string' && SNOWFLAKE.test(value);
}

function validateBridgeConfiguration({ controlUrl, secret, headerName = 'Authorization', authScheme = 'Bearer' }) {
  if (!validBridgeSecret(secret)) {
    throw new BridgeOperationError('bridge_secret_invalid', 'سر الجسر غير مضبوط أو تنسيقه غير صالح.');
  }
  if (typeof headerName !== 'string' || headerName.toLowerCase() !== 'authorization' || authScheme !== 'Bearer') {
    throw new BridgeOperationError('bridge_auth_contract_invalid', 'إعداد المصادقة لا يطابق عقد Manus: Authorization: Bearer.');
  }
  let parsed;
  try {
    parsed = new URL(controlUrl);
  } catch {
    throw new BridgeOperationError('bridge_url_invalid', 'عنوان EM7 CONTROL غير صالح.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new BridgeOperationError('bridge_url_invalid', 'يجب أن يكون عنوان EM7 CONTROL رابط HTTPS صالحًا دون بيانات اعتماد أو معاملات.');
  }
  return parsed.toString().replace(/\/$/, '');
}

function normalizePermissions(value) {
  if (value === undefined) return {};
  if (!isObject(value)) throw new BridgeOperationError('invalid_permissions', 'بيانات الصلاحيات غير صالحة.');
  const normalized = {};
  for (const [name, enabled] of Object.entries(value)) {
    if (!Object.hasOwn(PERMISSION_BITS, name) || typeof enabled !== 'boolean') {
      throw new BridgeOperationError('invalid_permissions', 'إحدى الصلاحيات غير مسموحة أو قيمتها غير صالحة.');
    }
    normalized[name] = enabled;
  }
  return normalized;
}

function normalizeColor(value) {
  if (value === undefined) return '#8b5cf6';
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new BridgeOperationError('invalid_payload', 'لون الدور غير صالح.');
  }
  return value.toLowerCase();
}

function normalizePosition(value, fallback) {
  const position = value === undefined ? fallback : value;
  if (!Number.isInteger(position) || position < 0 || position > 250) {
    throw new BridgeOperationError('invalid_payload', 'ترتيب الدور غير صالح.');
  }
  return position;
}

function normalizePayload(type, input) {
  if (!isObject(input)) throw new BridgeOperationError('invalid_payload', 'تفاصيل العملية غير صالحة.');

  if (type === 'create_channel') {
    const name = cleanString(input.name, 90);
    if (!name || !['text', 'voice'].includes(input.channelType)) {
      throw new BridgeOperationError('invalid_payload', 'بيانات القناة غير صالحة.');
    }
    return { name, channelType: input.channelType };
  }

  if (type === 'create_role') {
    const name = cleanString(input.name, 100);
    if (!name) throw new BridgeOperationError('invalid_payload', 'اسم الدور غير صالح.');
    return {
      name,
      color: normalizeColor(input.color),
      position: normalizePosition(input.position, 1),
      permissions: normalizePermissions(input.permissions),
    };
  }

  if (type === 'create_rooms') {
    if (!Array.isArray(input.categories) || input.categories.length > 12
      || !Array.isArray(input.roles) || input.roles.length > 30) {
      throw new BridgeOperationError('invalid_payload', 'عدد الفئات أو الأدوار خارج الحدود المسموحة.');
    }
    if (input.categories.length === 0 && input.roles.length === 0) {
      throw new BridgeOperationError('invalid_payload', 'لا تحتوي العملية على فئات أو أدوار لإنشائها.');
    }
    const categories = input.categories.map(category => {
      if (!isObject(category)) throw new BridgeOperationError('invalid_payload', 'بيانات الفئة غير صالحة.');
      const name = cleanString(category.name, 90);
      if (!name || !Array.isArray(category.channels) || category.channels.length > 50) {
        throw new BridgeOperationError('invalid_payload', 'بيانات الفئة أو قنواتها غير صالحة.');
      }
      const channels = category.channels.map(channel => {
        if (!isObject(channel)) throw new BridgeOperationError('invalid_payload', 'بيانات القناة غير صالحة.');
        const channelName = cleanString(channel.name, 90);
        if (!channelName || !['text', 'voice'].includes(channel.type)) {
          throw new BridgeOperationError('invalid_payload', 'اسم القناة أو نوعها غير صالح.');
        }
        return { name: channelName, type: channel.type };
      });
      return { name, channels };
    });
    const roles = input.roles.map((role, index) => {
      if (!isObject(role)) throw new BridgeOperationError('invalid_payload', 'بيانات الدور غير صالحة.');
      const name = cleanString(role.name, 100);
      if (!name) throw new BridgeOperationError('invalid_payload', 'اسم الدور غير صالح.');
      return {
        name,
        color: normalizeColor(role.color),
        position: normalizePosition(role.position, index + 1),
        permissions: normalizePermissions(role.permissions),
      };
    });
    const resourceCount = categories.reduce((count, category) => count + 1 + category.channels.length, 0) + roles.length;
    if (resourceCount > MAX_CREATE_ROOMS_RESOURCES) {
      throw new BridgeOperationError('operation_too_large', `لا يمكن إنشاء أكثر من ${MAX_CREATE_ROOMS_RESOURCES} موردًا في طلب واحد.`);
    }
    return { categories, roles };
  }

  if (type === 'update_role') {
    if (!validSnowflake(input.roleId)) throw new BridgeOperationError('invalid_payload', 'معرّف الدور غير صالح.');
    const changes = { roleId: input.roleId };
    if (input.name !== undefined) {
      const name = cleanString(input.name, 100);
      if (!name) throw new BridgeOperationError('invalid_payload', 'اسم الدور غير صالح.');
      changes.name = name;
    }
    if (input.color !== undefined) changes.color = normalizeColor(input.color);
    if (input.position !== undefined) changes.position = normalizePosition(input.position, 0);
    if (input.permissions !== undefined) changes.permissions = normalizePermissions(input.permissions);
    if (Object.keys(changes).length === 1) throw new BridgeOperationError('invalid_payload', 'لم يُحدّد أي تغيير للدور.');
    return changes;
  }

  if (type === 'set_channel_permissions') {
    if (!validSnowflake(input.channelId) || !validSnowflake(input.roleId)) {
      throw new BridgeOperationError('invalid_payload', 'معرّف القناة أو الدور غير صالح.');
    }
    if (!isObject(input.permissions)) throw new BridgeOperationError('invalid_permissions', 'بيانات صلاحيات القناة غير صالحة.');
    return {
      channelId: input.channelId,
      roleId: input.roleId,
      permissions: normalizePermissions(input.permissions),
    };
  }

  throw new BridgeOperationError('operation_not_allowed', 'نوع العملية غير مدعوم.');
}

function normalizeOperation(input) {
  if (!isObject(input)
    || !validOperationId(input.id)
    || !validIdempotencyKey(input.idempotencyKey)
    || !validSnowflake(input.guildId)
    || typeof input.type !== 'string'
    || !OPERATION_TYPES.has(input.type)) {
    throw new BridgeOperationError('operation_invalid', 'غلاف العملية غير صالح.');
  }
  return {
    id: input.id,
    idempotencyKey: input.idempotencyKey.toLowerCase(),
    type: input.type,
    guildId: input.guildId,
    payload: normalizePayload(input.type, input.payload),
  };
}

function rolePermissionBits(permissions) {
  let bits = 0n;
  for (const [name, enabled] of Object.entries(permissions)) {
    if (enabled) bits |= PERMISSION_BITS[name];
  }
  return bits;
}

function updatePermissionBits(current, changes) {
  let bits = BigInt(current);
  for (const [name, enabled] of Object.entries(changes)) {
    const flag = PERMISSION_BITS[name];
    bits = enabled ? (bits | flag) : (bits & ~flag);
  }
  return bits;
}

function overwriteOptions(permissions) {
  const result = {};
  for (const [name, enabled] of Object.entries(permissions)) {
    result[OVERWRITE_PERMISSION_NAMES[name]] = enabled;
  }
  return result;
}

function validPollInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_IDLE_POLL_MS;
  return Math.min(MAX_IDLE_POLL_MS, Math.max(MIN_IDLE_POLL_MS, Math.floor(parsed)));
}

function safeDiscordStatus(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function safeDiscordCode(error) {
  const code = error?.code;
  if (typeof code === 'number' && Number.isInteger(code)) return String(code).slice(0, 12);
  if (typeof code === 'string' && /^\d{1,12}$/.test(code)) return code;
  return undefined;
}

function resultForError(error, executionMs, partial = {}) {
  const status = safeDiscordStatus(error);
  const discordCode = safeDiscordCode(error);
  const knownBridgeError = error instanceof BridgeOperationError;
  let reason = knownBridgeError ? error.code : 'discord_api_error';
  let summary = knownBridgeError ? error.summary : 'تعذر إكمال العملية عبر Discord. تحقّق من الصلاحيات والنتيجة الفعلية.';
  let uncertain = false;

  if (!knownBridgeError) {
    if (status === 400) summary = 'رفض Discord بيانات العملية.';
    else if (status === 401) summary = 'رفض Discord اعتماد البوت.';
    else if (status === 403) summary = 'لا يملك البوت الصلاحية المطلوبة أو أن ترتيب الدور يمنع التغيير.';
    else if (status === 404) summary = 'الخادم أو القناة أو الدور المطلوب غير موجود أو غير متاح للبوت.';
    else if (status === 429) summary = 'رفض Discord العملية مؤقتًا بسبب حدود المعدل؛ لم تُعَد عملية الإنشاء تلقائيًا.';
    else {
      summary = 'تعذر تأكيد نتيجة Discord. تحقّق من الخادم قبل إرسال طلب إنشاء بديل.';
      reason = 'discord_result_uncertain';
      uncertain = true;
    }
  }

  const details = {
    reason,
    executionMs,
    ...(status === undefined ? {} : { discordStatus: status }),
    ...(discordCode === undefined ? {} : { discordCode }),
    ...(uncertain ? { outcomeUncertain: true } : {}),
    ...(partial.createdIds?.length ? { createdIds: partial.createdIds.slice(0, 100) } : {}),
    ...(partial.createdCategories?.length ? { createdCategories: partial.createdCategories.slice(0, 12) } : {}),
    ...(partial.createdRoles?.length ? { createdRoles: partial.createdRoles.slice(0, 30) } : {}),
  };
  return { success: false, summary, details };
}

function hashInvalidOperationId(id) {
  return crypto.createHash('sha256').update(`em7-invalid-operation:${id}`).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item) ?? 'null').join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key]) ?? 'null'}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprintOperation(value) {
  let canonical;
  try { canonical = canonicalJson(value); }
  catch { canonical = undefined; }
  return crypto.createHash('sha256')
    .update(typeof canonical === 'string' ? canonical : 'invalid-operation-envelope')
    .digest('hex');
}

class IdempotencyStore {
  constructor(filePath = path.resolve(process.cwd(), '.em7-bridge-state.json')) {
    this.filePath = path.resolve(filePath);
    this.data = null;
  }

  async load() {
    if (this.data) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!isObject(parsed) || parsed.version !== 2 || !isObject(parsed.records)) {
        throw new Error('STATE_SCHEMA_INVALID');
      }
      for (const [key, record] of Object.entries(parsed.records)) {
        if (!IDEMPOTENCY_KEY.test(key) || !isObject(record)
          || !validOperationId(record.operationId)
          || !validIdempotencyKey(record.fingerprint)
          || !['in_progress', 'completed', 'failed'].includes(record.status)) {
          throw new Error('STATE_RECORD_INVALID');
        }
      }
      this.data = parsed;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.data = { version: 2, records: {} };
        return;
      }
      throw new BridgeOperationError('idempotency_store_unavailable', 'تعذر قراءة سجل منع التكرار؛ أُوقف التنفيذ حمايةً من إنشاء مكرر.');
    }
  }

  get(key) {
    if (!this.data) throw new BridgeOperationError('idempotency_store_unavailable', 'سجل منع التكرار غير جاهز.');
    return this.data.records[key] ?? null;
  }

  findByOperationId(operationId) {
    if (!this.data) throw new BridgeOperationError('idempotency_store_unavailable', 'سجل منع التكرار غير جاهز.');
    const found = Object.entries(this.data.records).find(([, record]) => record.operationId === operationId);
    return found ? { key: found[0], ...found[1] } : null;
  }

  async put(key, record) {
    if (!this.data) throw new BridgeOperationError('idempotency_store_unavailable', 'سجل منع التكرار غير جاهز.');
    if (!validIdempotencyKey(key) || !isObject(record) || !validOperationId(record.operationId)
      || !validIdempotencyKey(record.fingerprint)
      || !['in_progress', 'completed', 'failed'].includes(record.status)) {
      throw new BridgeOperationError('idempotency_store_unavailable', 'سجل منع التكرار غير صالح؛ أُوقف التنفيذ حمايةً من التكرار.');
    }
    this.data.records[key] = { ...record, updatedAt: new Date().toISOString() };
    this.prune();
    await this.flush();
  }

  prune() {
    const entries = Object.entries(this.data.records);
    const cutoff = Date.now() - STATE_RETENTION_MS;
    for (const [key, record] of entries) {
      if (record.status === 'in_progress') continue;
      const updated = Date.parse(record.updatedAt ?? '');
      if (Number.isFinite(updated) && updated < cutoff) delete this.data.records[key];
    }
    const remaining = Object.entries(this.data.records)
      .filter(([, record]) => record.status !== 'in_progress')
      .sort((a, b) => Date.parse(a[1].updatedAt ?? '') - Date.parse(b[1].updatedAt ?? ''));
    while (Object.keys(this.data.records).length > MAX_STATE_RECORDS && remaining.length) {
      const [key] = remaining.shift();
      delete this.data.records[key];
    }
  }

  async flush() {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    const contents = JSON.stringify(this.data);
    try {
      await fs.writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600, flag: 'w' });
      await fs.chmod(temporary, 0o600);
      await fs.rename(temporary, this.filePath);
      await fs.chmod(this.filePath, 0o600);
    } catch {
      await fs.unlink(temporary).catch(() => {});
      throw new BridgeOperationError('idempotency_store_unavailable', 'تعذر حفظ سجل منع التكرار؛ أُوقف التنفيذ حمايةً من إنشاء مكرر.');
    }
  }
}

class BridgeExecutionEngine {
  constructor({
    client,
    controlUrl,
    secret,
    headerName = 'Authorization',
    authScheme = 'Bearer',
    stateFile,
    pollIntervalMs = DEFAULT_IDLE_POLL_MS,
    claimTimeoutMs = CLAIM_TIMEOUT_MS,
    resultTimeoutMs = RESULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    logger = console,
  }) {
    if (!client) throw new TypeError('A Discord.js client is required.');
    if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
    this.client = client;
    this.controlUrl = validateBridgeConfiguration({ controlUrl, secret, headerName, authScheme });
    this.secret = secret;
    this.pollIntervalMs = validPollInterval(pollIntervalMs);
    this.claimTimeoutMs = claimTimeoutMs;
    this.resultTimeoutMs = resultTimeoutMs;
    this.fetch = fetchImpl;
    this.logger = logger;
    this.store = new IdempotencyStore(stateFile);
    this.running = false;
    this.loopPromise = null;
    this.timer = null;
    this.wakeTimer = null;
    this.lastPollError = null;
    this.lastPollErrorAt = 0;
    this.stopController = new AbortController();
  }

  emit(event, fields = {}) {
    const entry = { at: new Date().toISOString(), event, ...fields };
    this.logger.log(`[BRIDGE] ${JSON.stringify(entry)}`);
  }

  authHeaders() {
    return {
      Authorization: `Bearer ${this.secret}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async start() {
    if (this.running) return;
    await this.store.load();
    this.running = true;
    this.emit('worker_started', { idlePollMs: this.pollIntervalMs, resultTimeoutMs: this.resultTimeoutMs });
    this.loopPromise = this.runLoop();
  }

  async stop() {
    this.running = false;
    this.stopController.abort();
    if (this.timer) clearTimeout(this.timer);
    this.wakeTimer?.();
    if (this.loopPromise) await this.loopPromise;
  }

  async runLoop() {
    let delay = this.pollIntervalMs;
    while (this.running) {
      try {
        const outcome = await this.pollOnce();
        this.lastPollError = null;
        delay = outcome === 'idle' ? this.pollIntervalMs : 250;
      } catch (error) {
        const status = safeDiscordStatus(error);
        const code = typeof error?.code === 'string' && /^[a-z0-9_-]{1,48}$/i.test(error.code)
          ? error.code
          : 'bridge_request_failed';
        const key = `${code}:${status ?? ''}`;
        const now = Date.now();
        if (key !== this.lastPollError || now - this.lastPollErrorAt >= 30000) {
          this.emit('poll_failed', { code, ...(status === undefined ? {} : { httpStatus: status }) });
          this.lastPollError = key;
          this.lastPollErrorAt = now;
        }
        delay = Math.min(MAX_ERROR_BACKOFF_MS, Math.max(this.pollIntervalMs, delay * 2));
      }
      if (this.running) await this.wait(delay);
    }
  }

  wait(ms) {
    return new Promise(resolve => {
      this.wakeTimer = resolve;
      this.timer = setTimeout(resolve, ms);
    });
  }

  async postJson(url, payload, timeoutMs) {
    return this.fetch(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), this.stopController.signal]),
    });
  }

  async pollOnce() {
    await this.store.load();
    const startedAt = Date.now();
    let response;
    try {
      response = await this.postJson(`${this.controlUrl}${CLAIM_PATH}`, {}, this.claimTimeoutMs);
    } catch (error) {
      const failure = new Error('Bridge claim request failed.');
      failure.code = error?.name === 'TimeoutError' ? 'bridge_claim_timeout' : 'bridge_network_error';
      throw failure;
    }
    if (!response.ok) {
      const failure = new Error('Bridge claim was rejected.');
      failure.status = response.status;
      failure.code = response.status === 401 ? 'bridge_unauthorized'
        : response.status === 503 ? 'bridge_not_configured' : 'bridge_http_error';
      throw failure;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      const failure = new Error('Bridge response was not valid JSON.');
      failure.code = 'bridge_invalid_json';
      throw failure;
    }
    if (!isObject(data) || !Object.hasOwn(data, 'operation')) {
      const failure = new Error('Bridge claim response did not match the protocol.');
      failure.code = 'bridge_invalid_response';
      throw failure;
    }
    if (data.operation === null) return 'idle';

    this.emit('operation_claimed', { claimMs: Date.now() - startedAt });
    await this.processClaimedOperation(data.operation);
    return 'operation';
  }

  async processClaimedOperation(raw) {
    const operationId = isObject(raw) && validOperationId(raw.id) ? raw.id : null;
    if (!operationId) {
      this.emit('operation_rejected', { reason: 'operation_id_invalid' });
      return;
    }

    const key = validIdempotencyKey(raw.idempotencyKey)
      ? raw.idempotencyKey.toLowerCase()
      : hashInvalidOperationId(operationId);
    const operationShortId = operationId.slice(0, 8);
    this.emit('operation_received', { operation: operationShortId });

    let operation;
    let validationError;
    try {
      operation = normalizeOperation(raw);
    } catch (error) {
      validationError = error instanceof BridgeOperationError
        ? error
        : new BridgeOperationError('operation_invalid', 'بيانات العملية غير صالحة.');
    }
    const fingerprint = fingerprintOperation(operation ?? raw);

    let previous;
    let operationRecord;
    try {
      previous = this.store.get(key);
      operationRecord = this.store.findByOperationId(operationId);
    } catch {
      const result = resultForError(new BridgeOperationError(
        'idempotency_store_unavailable',
        'تعذر استخدام سجل منع التكرار؛ لم يُنفّذ أي تغيير في Discord.',
      ), 0);
      await this.reportResult(operationId, result, operationShortId);
      return;
    }

    if ((operationRecord && operationRecord.key !== key)
      || (previous && (previous.operationId !== operationId || previous.fingerprint !== fingerprint))) {
      const result = resultForError(new BridgeOperationError(
        'idempotency_conflict',
        'تعارض معرّف العملية أو محتواها مع سجل محفوظ؛ أُوقف التنفيذ.',
      ), 0);
      this.emit('duplicate_blocked', { operation: operationShortId, reason: 'idempotency_conflict' });
      await this.reportResult(operationId, result, operationShortId);
      return;
    }

    if (validationError) {
      if (previous?.status === 'failed') {
        await this.reportResult(operationId, previous.result, operationShortId);
      } else {
        const result = resultForError(validationError, 0);
        await this.storeFailure(key, operationId, fingerprint, result);
        await this.reportResult(operationId, result, operationShortId);
      }
      return;
    }
    this.emit('validation_completed', { operation: operationShortId, type: operation.type });

    if (previous) {
      if (previous.operationId !== operationId) {
        const result = resultForError(new BridgeOperationError(
          'idempotency_conflict',
          'تعارض مفتاح منع التكرار مع عملية محفوظة؛ أُوقف التنفيذ.',
        ), 0);
        this.emit('duplicate_blocked', { operation: operationShortId, reason: 'idempotency_conflict' });
        await this.reportResult(operationId, result, operationShortId);
        return;
      }
      if (previous.status === 'completed') {
        this.emit('duplicate_blocked', { operation: operationShortId, reason: 'stored_terminal_result' });
        await this.reportResult(operationId, previous.result, operationShortId);
        return;
      }
      if (previous.status === 'failed') {
        const outcomeUncertain = previous.result?.details?.outcomeUncertain === true;
        if (!SAFE_RETRY_TYPES.has(operation.type) || outcomeUncertain) {
          this.emit('duplicate_blocked', { operation: operationShortId, reason: outcomeUncertain ? 'uncertain_outcome' : 'unsafe_retry_type' });
          await this.reportResult(operationId, previous.result, operationShortId);
          return;
        }
        this.emit('safe_retry_authorized', { operation: operationShortId, type: operation.type });
      }
      if (previous.status === 'in_progress') {
        const result = resultForError(new BridgeOperationError(
          'execution_interrupted',
          'انقطع العامل أثناء التنفيذ؛ لم تُعَد العملية لتجنّب إنشاء مكرر. تحقّق يدويًا من Discord.',
          { outcomeUncertain: true },
        ), 0);
        result.details.outcomeUncertain = true;
        await this.storeFailure(key, operationId, fingerprint, result);
        this.emit('duplicate_blocked', { operation: operationShortId, reason: 'previous_execution_interrupted' });
        await this.reportResult(operationId, result, operationShortId);
        return;
      }
    }

    try {
      await this.store.put(key, { operationId, fingerprint, status: 'in_progress' });
    } catch {
      const result = resultForError(new BridgeOperationError(
        'idempotency_store_unavailable',
        'تعذر حفظ سجل منع التكرار؛ لم يُنفّذ أي تغيير في Discord.',
      ), 0);
      this.emit('execution_blocked', { operation: operationShortId, reason: 'idempotency_store_unavailable' });
      await this.reportResult(operationId, result, operationShortId);
      return;
    }

    const startedAt = Date.now();
    const partial = { createdIds: [], createdCategories: [], createdRoles: [] };
    this.emit('execution_started', { operation: operationShortId, type: operation.type });
    try {
      const details = await this.executeOperation(operation, partial, operationShortId);
      const result = {
        success: true,
        summary: this.successSummary(operation.type),
        details: { ...details, executionMs: Date.now() - startedAt },
      };
      await this.store.put(key, { operationId, fingerprint, status: 'completed', result });
      this.emit('execution_completed', {
        operation: operationShortId,
        type: operation.type,
        executionMs: result.details.executionMs,
        resourceCount: result.details.resourceCount ?? 0,
      });
      await this.reportResult(operationId, result, operationShortId);
    } catch (error) {
      const executionMs = Date.now() - startedAt;
      const result = resultForError(error, executionMs, partial);
      try {
        await this.store.put(key, { operationId, fingerprint, status: 'failed', result });
      } catch {
        this.emit('state_write_failed', { operation: operationShortId });
      }
      this.emit('execution_failed', {
        operation: operationShortId,
        reason: result.details.reason,
        executionMs,
        ...(result.details.discordStatus === undefined ? {} : { httpStatus: result.details.discordStatus }),
        ...(result.details.discordCode === undefined ? {} : { discordCode: result.details.discordCode }),
      });
      await this.reportResult(operationId, result, operationShortId);
    }
  }

  async storeFailure(key, operationId, fingerprint, result) {
    try {
      await this.store.put(key, { operationId, fingerprint, status: 'failed', result });
    } catch {
      this.emit('state_write_failed', { operation: operationId.slice(0, 8) });
    }
  }

  async reportResult(operationId, result, operationShortId) {
    const startedAt = Date.now();
    const url = `${this.controlUrl}${RESULT_PATH}/${encodeURIComponent(operationId)}/result`;
    try {
      const response = await this.postJson(url, result, this.resultTimeoutMs);
      if (response.ok) {
        this.emit('result_reported', {
          operation: operationShortId,
          httpStatus: response.status,
          reportMs: Date.now() - startedAt,
          success: result.success,
        });
        return true;
      }
      let code;
      try {
        const body = await response.json();
        if (body?.error === 'operation_not_running') code = body.error;
      } catch { /* Do not log response text or arbitrary provider details. */ }
      this.emit('result_report_failed', {
        operation: operationShortId,
        httpStatus: response.status,
        ...(code ? { code } : {}),
      });
      return false;
    } catch (error) {
      this.emit('result_report_failed', {
        operation: operationShortId,
        code: error?.name === 'TimeoutError' ? 'result_timeout' : 'result_network_error',
      });
      return false;
    }
  }

  successSummary(type) {
    return ({
      create_rooms: 'تم إنشاء بنية الخادم المحددة بنجاح في Discord.',
      create_channel: 'أنشأ Discord القناة المطلوبة بنجاح.',
      create_role: 'أنشأ Discord الدور المطلوب بنجاح.',
      update_role: 'حدّث Discord الدور وفق التغييرات المطلوبة بنجاح.',
      set_channel_permissions: 'حدّث Discord صلاحيات القناة للدور المحدد بنجاح.',
    })[type];
  }

  async callDiscord(operationShortId, resource, callback) {
    const startedAt = Date.now();
    try {
      const result = await callback();
      this.emit('discord_api_response', {
        operation: operationShortId,
        resource,
        httpStatus: 200,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.emit('discord_api_response', {
        operation: operationShortId,
        resource,
        ok: false,
        durationMs: Date.now() - startedAt,
        ...(safeDiscordStatus(error) === undefined ? {} : { httpStatus: safeDiscordStatus(error) }),
        ...(safeDiscordCode(error) === undefined ? {} : { discordCode: safeDiscordCode(error) }),
      });
      throw error;
    }
  }

  async getGuild(guildId, operationShortId) {
    let guild = this.client.guilds.cache.get(guildId);
    if (guild) return guild;
    try {
      guild = await this.callDiscord(operationShortId, 'guild_lookup', () => this.client.guilds.fetch(guildId));
    } catch (error) {
      const status = safeDiscordStatus(error);
      if (status === 404 || status === 403) {
        throw new BridgeOperationError('bot_not_in_guild', 'البوت غير موجود في الخادم المحدد أو لا يستطيع الوصول إليه.');
      }
      throw error;
    }
    if (!guild || guild.id !== guildId) {
      throw new BridgeOperationError('bot_not_in_guild', 'البوت غير موجود في الخادم المحدد أو لا يستطيع الوصول إليه.');
    }
    return guild;
  }

  async getMe(guild, operationShortId) {
    if (guild.members.me) return guild.members.me;
    try {
      const me = await this.callDiscord(operationShortId, 'bot_member_lookup', () => guild.members.fetchMe());
      if (me) return me;
    } catch (error) {
      if (safeDiscordStatus(error) === 404 || safeDiscordStatus(error) === 403) {
        throw new BridgeOperationError('bot_not_in_guild', 'تعذر التحقق من عضوية البوت في الخادم المحدد.');
      }
      throw error;
    }
    throw new BridgeOperationError('bot_not_in_guild', 'تعذر التحقق من عضوية البوت في الخادم المحدد.');
  }

  memberHas(member, permissionName) {
    const bitfield = member?.permissions?.bitfield;
    if (bitfield === undefined) {
      throw new BridgeOperationError('permission_state_unavailable', 'تعذر التحقق من صلاحيات البوت؛ أُوقف التنفيذ قبل إجراء التغيير.');
    }
    const current = BigInt(bitfield);
    const required = PERMISSION_BITS[permissionName];
    return (current & required) === required;
  }

  requirePermission(member, permissionName) {
    if (!this.memberHas(member, permissionName)) {
      throw new BridgeOperationError('permission_missing', `يفتقد البوت صلاحية ${permissionName}.`);
    }
  }

  requireRoleBelowBot(role, me, guild) {
    const botHighest = me.roles?.highest;
    if (!role || role.id === guild.id || role.managed || !botHighest || role.position >= botHighest.position) {
      throw new BridgeOperationError('role_hierarchy_blocked', 'ترتيب الدور أو حالته يمنع البوت من تعديله بأمان.');
    }
  }

  async getRole(guild, roleId, operationShortId) {
    let role = guild.roles.cache.get(roleId);
    if (role) return role;
    try {
      role = await this.callDiscord(operationShortId, 'role_lookup', () => guild.roles.fetch(roleId));
    } catch (error) {
      if (safeDiscordStatus(error) === 404 || safeDiscordStatus(error) === 403) {
        throw new BridgeOperationError('role_not_found', 'الدور غير موجود في الخادم المحدد أو لا يمكن الوصول إليه.');
      }
      throw error;
    }
    if (!role || role.guild.id !== guild.id) {
      throw new BridgeOperationError('role_not_found', 'الدور غير موجود في الخادم المحدد أو لا يمكن الوصول إليه.');
    }
    return role;
  }

  async getChannel(guild, channelId, operationShortId) {
    let channel = guild.channels.cache.get(channelId);
    if (channel) return channel;
    try {
      channel = await this.callDiscord(operationShortId, 'channel_lookup', () => guild.channels.fetch(channelId));
    } catch (error) {
      if (safeDiscordStatus(error) === 404 || safeDiscordStatus(error) === 403) {
        throw new BridgeOperationError('channel_not_found', 'القناة غير موجودة في الخادم المحدد أو لا يمكن الوصول إليها.');
      }
      throw error;
    }
    if (!channel || channel.guildId !== guild.id) {
      throw new BridgeOperationError('channel_not_found', 'القناة غير موجودة في الخادم المحدد أو لا يمكن الوصول إليها.');
    }
    return channel;
  }

  async executeOperation(operation, partial, operationShortId) {
    const guild = await this.getGuild(operation.guildId, operationShortId);
    const me = await this.getMe(guild, operationShortId);
    const payload = operation.payload;
    const needsChannels = operation.type === 'create_channel'
      || (operation.type === 'create_rooms' && payload.categories.length > 0);
    const needsRoles = operation.type === 'create_role'
      || operation.type === 'update_role'
      || operation.type === 'set_channel_permissions'
      || (operation.type === 'create_rooms' && payload.roles.length > 0);
    if (needsChannels) this.requirePermission(me, 'Manage Channels');
    if (needsRoles) this.requirePermission(me, 'Manage Roles');

    const highest = me.roles?.highest;
    const requestedRoles = operation.type === 'create_role'
      ? [payload]
      : operation.type === 'create_rooms' ? payload.roles : [];
    if (highest) {
      for (const roleSpec of requestedRoles) {
        if (roleSpec.position > 0 && roleSpec.position >= highest.position) {
          throw new BridgeOperationError('role_hierarchy_blocked', 'لا يمكن وضع الدور عند مستوى أعلى من رتبة البوت أو مساويًا لها.');
        }
      }
    }

    const reason = `EM7 operation ${operation.id}`;
    if (operation.type === 'create_channel') {
      const channel = await this.callDiscord(operationShortId, 'channel_create', () => guild.channels.create({
        name: payload.name,
        type: payload.channelType === 'text' ? 0 : 2,
        reason,
      }));
      partial.createdIds.push(channel.id);
      return { createdIds: partial.createdIds, resourceCount: 1 };
    }

    if (operation.type === 'create_role') {
      const role = await this.callDiscord(operationShortId, 'role_create', () => guild.roles.create({
        name: payload.name,
        color: Number.parseInt(payload.color.slice(1), 16),
        permissions: rolePermissionBits(payload.permissions),
        reason,
      }));
      partial.createdRoles.push(role.id);
      if (role.position !== payload.position) {
        await this.callDiscord(operationShortId, 'role_position_update', () => role.setPosition(payload.position, { reason }));
      }
      return { createdRoles: partial.createdRoles, resourceCount: 1 };
    }

    if (operation.type === 'update_role') {
      const role = await this.getRole(guild, payload.roleId, operationShortId);
      this.requireRoleBelowBot(role, me, guild);
      const changes = {};
      if (payload.name !== undefined) changes.name = payload.name;
      if (payload.color !== undefined) changes.color = Number.parseInt(payload.color.slice(1), 16);
      if (payload.permissions !== undefined) {
        changes.permissions = updatePermissionBits(role.permissions.bitfield, payload.permissions);
      }
      const updated = await this.callDiscord(operationShortId, 'role_update', () => role.edit({ ...changes, reason }));
      if (payload.position !== undefined && updated.position !== payload.position) {
        await this.callDiscord(operationShortId, 'role_position_update', () => updated.setPosition(payload.position, { reason }));
      }
      return { updatedRoleId: role.id, resourceCount: 1 };
    }

    if (operation.type === 'set_channel_permissions') {
      const [channel, role] = await Promise.all([
        this.getChannel(guild, payload.channelId, operationShortId),
        this.getRole(guild, payload.roleId, operationShortId),
      ]);
      this.requireRoleBelowBot(role, me, guild);
      if (!channel.permissionOverwrites?.edit) {
        throw new BridgeOperationError('channel_permissions_unsupported', 'لا تدعم القناة تعديل صلاحيات الدور المطلوب.');
      }
      await this.callDiscord(operationShortId, 'channel_permission_overwrite', () => channel.permissionOverwrites.edit(
        role,
        overwriteOptions(payload.permissions),
        { reason },
      ));
      return {
        channelId: channel.id,
        roleId: role.id,
        changedPermissionCount: Object.keys(payload.permissions).length,
        resourceCount: 1,
      };
    }

    if (operation.type === 'create_rooms') {
      for (const categorySpec of payload.categories) {
        const category = await this.callDiscord(operationShortId, 'category_create', () => guild.channels.create({
          name: categorySpec.name,
          type: 4,
          reason,
        }));
        partial.createdCategories.push(category.id);
        partial.createdIds.push(category.id);
        for (const channelSpec of categorySpec.channels) {
          const channel = await this.callDiscord(operationShortId, 'channel_create', () => guild.channels.create({
            name: channelSpec.name,
            type: channelSpec.type === 'text' ? 0 : 2,
            parent: category.id,
            reason,
          }));
          partial.createdIds.push(channel.id);
        }
      }
      for (const roleSpec of payload.roles) {
        const role = await this.callDiscord(operationShortId, 'role_create', () => guild.roles.create({
          name: roleSpec.name,
          color: Number.parseInt(roleSpec.color.slice(1), 16),
          permissions: rolePermissionBits(roleSpec.permissions),
          reason,
        }));
        partial.createdRoles.push(role.id);
        if (role.position !== roleSpec.position) {
          await this.callDiscord(operationShortId, 'role_position_update', () => role.setPosition(roleSpec.position, { reason }));
        }
      }
      return {
        createdIds: partial.createdIds,
        createdCategories: partial.createdCategories,
        createdRoles: partial.createdRoles,
        resourceCount: partial.createdIds.length + partial.createdRoles.length,
      };
    }

    throw new BridgeOperationError('operation_not_allowed', 'نوع العملية غير مدعوم.');
  }
}

module.exports = {
  BridgeExecutionEngine,
  BridgeOperationError,
  IdempotencyStore,
  OPERATION_TYPES,
  PERMISSION_BITS,
  CLAIM_PATH,
  RESULT_PATH,
  fingerprintOperation,
  normalizeOperation,
  normalizePayload,
  rolePermissionBits,
  updatePermissionBits,
  overwriteOptions,
  validBridgeSecret,
  validPollInterval,
  validateBridgeConfiguration,
};
