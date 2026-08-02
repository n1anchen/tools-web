export type HttpStatusCategory = '1' | '2' | '3' | '4' | '5'

export interface HttpStatusCode {
  code: number
  name: string
  description: string
  category: HttpStatusCategory
  common?: boolean
  note?: string
  usage?: string
  advice?: string
  tags?: string[]
}

export const HTTP_STATUS_CATEGORIES = [
  { value: '1', label: '信息响应', summary: '请求已收到，继续处理', tone: 'sky' },
  { value: '2', label: '成功', summary: '请求已成功接收和处理', tone: 'emerald' },
  { value: '3', label: '重定向', summary: '需要进一步操作才能完成', tone: 'amber' },
  { value: '4', label: '客户端错误', summary: '请求语法或状态不满足要求', tone: 'rose' },
  { value: '5', label: '服务器错误', summary: '服务端未能完成有效请求', tone: 'violet' },
] as const

const item = (
  code: number,
  name: string,
  description: string,
  options: Omit<HttpStatusCode, 'code' | 'name' | 'description' | 'category'> = {},
): HttpStatusCode => ({ code, name, description, category: String(Math.floor(code / 100)) as HttpStatusCategory, ...options })

export const HTTP_STATUS_CODES: HttpStatusCode[] = [
  item(100, 'Continue', '服务器已收到请求头，客户端可以继续发送请求体。', { tags: ['继续上传', 'Expect'] }),
  item(101, 'Switching Protocols', '服务器同意按 Upgrade 请求头切换协议。', { tags: ['WebSocket', '协议升级'] }),
  item(102, 'Processing', 'WebDAV 请求仍在处理，暂时还没有最终响应。', { note: 'WebDAV' }),
  item(103, 'Early Hints', '在最终响应前提示客户端预加载可能需要的资源。', { tags: ['预加载', 'Link'] }),
  item(104, 'Upload Resumption Supported', '服务器支持可恢复上传；当前属于有期限的临时登记。', { note: '临时登记，预计 2026-11-13 到期', tags: ['断点续传', '上传'] }),

  item(200, 'OK', '请求成功，响应体通常包含所请求的资源或处理结果。', { common: true, usage: 'GET 查询成功、PUT/PATCH 更新成功，或通用操作正常完成。', advice: '根据接口约定返回稳定的数据结构，并设置正确的 Content-Type。' }),
  item(201, 'Created', '请求成功，并创建了一个或多个新资源。', { common: true, usage: 'POST 创建用户、订单或其他资源。', advice: '建议通过 Location 响应头返回新资源地址。' }),
  item(202, 'Accepted', '请求已接受，但异步处理尚未完成。', { common: true, tags: ['异步任务', '队列'] }),
  item(203, 'Non-Authoritative Information', '响应元数据由代理等中间节点修改，并非完全来自源服务器。'),
  item(204, 'No Content', '请求成功，但响应没有消息体。', { common: true, usage: '删除成功、无需返回内容的更新操作。', advice: '不要在 204 响应中附带消息体。' }),
  item(205, 'Reset Content', '请求成功，并要求客户端重置当前文档视图或表单。'),
  item(206, 'Partial Content', '服务器按 Range 请求头返回了资源的一部分。', { tags: ['分片下载', 'Range', '视频'] }),
  item(207, 'Multi-Status', 'WebDAV 响应包含多个资源各自的处理状态。', { note: 'WebDAV' }),
  item(208, 'Already Reported', 'WebDAV 响应中该绑定成员已经报告过。', { note: 'WebDAV' }),
  item(226, 'IM Used', '响应是对当前实例应用一个或多个增量操作后的结果。'),

  item(300, 'Multiple Choices', '请求有多个可能的响应，客户端需要选择。'),
  item(301, 'Moved Permanently', '资源已永久迁移到新的 URI。', { common: true, usage: '网站永久改版、域名迁移或规范地址跳转。', advice: '搜索引擎会更新索引；请确认确实是永久迁移。', tags: ['SEO', '永久重定向'] }),
  item(302, 'Found', '资源暂时位于另一个 URI，后续请求仍应使用原地址。', { common: true, usage: '短期活动页、登录流程或临时跳转。', advice: '若必须保持原请求方法，优先考虑 307。', tags: ['临时重定向'] }),
  item(303, 'See Other', '客户端应使用 GET 请求访问另一个 URI 获取结果。', { tags: ['POST-Redirect-GET'] }),
  item(304, 'Not Modified', '条件请求命中缓存，资源自上次获取后未修改。', { common: true, usage: '浏览器带 If-None-Match 或 If-Modified-Since 进行缓存验证。', advice: '不要返回完整响应体，并保持缓存相关响应头一致。', tags: ['缓存', 'ETag'] }),
  item(305, 'Use Proxy', '历史上表示必须通过代理访问；现代 HTTP 中已弃用。', { note: '已弃用' }),
  item(306, '(Unused)', '该状态码已不再使用，仅保留编号。', { note: '未使用' }),
  item(307, 'Temporary Redirect', '临时重定向，并要求客户端保持原请求方法和请求体。', { common: true }),
  item(308, 'Permanent Redirect', '永久重定向，并要求客户端保持原请求方法和请求体。', { common: true }),

  item(400, 'Bad Request', '请求格式、语法或参数无法被服务器理解。', { common: true, usage: 'JSON 解析失败、查询参数格式错误或必填字段缺失。', advice: '返回可定位字段的错误信息，不要把服务端异常笼统归为 400。' }),
  item(401, 'Unauthorized', '请求缺少有效的身份认证凭据。', { common: true, usage: 'Token 缺失、过期或签名无效。', advice: '通常应返回 WWW-Authenticate；401 表示“未认证”，不是“无权限”。', tags: ['认证', '登录'] }),
  item(402, 'Payment Required', '为未来的付费场景保留，具体语义由实现决定。'),
  item(403, 'Forbidden', '服务器理解请求，但拒绝执行。', { common: true, usage: '用户已登录但角色、权限或资源策略不允许访问。', advice: '避免泄露敏感资源是否存在；与 401 的认证失败区分。', tags: ['授权', '权限'] }),
  item(404, 'Not Found', '服务器找不到目标资源，或不愿透露其存在。', { common: true, usage: '路由不存在、资源 ID 无对应记录。', advice: '提供稳定的错误结构；公开网站可给出返回入口和搜索。' }),
  item(405, 'Method Not Allowed', '目标资源不支持当前请求方法。', { tags: ['Allow'] }),
  item(406, 'Not Acceptable', '服务器无法生成符合 Accept 等内容协商条件的响应。'),
  item(407, 'Proxy Authentication Required', '客户端需要先通过代理服务器认证。'),
  item(408, 'Request Timeout', '服务器等待客户端完成请求时超时。', { common: true }),
  item(409, 'Conflict', '请求与资源当前状态发生冲突。', { common: true, usage: '版本冲突、重复创建唯一资源或状态机不允许当前操作。', advice: '说明冲突对象和可恢复方式；并发更新可结合 ETag。' }),
  item(410, 'Gone', '资源已被永久移除，且没有转发地址。'),
  item(411, 'Length Required', '服务器要求提供 Content-Length。'),
  item(412, 'Precondition Failed', 'If-Match 等请求前置条件未满足。', { tags: ['并发控制', 'ETag'] }),
  item(413, 'Content Too Large', '请求内容超过服务器愿意或能够处理的大小。', { common: true, tags: ['上传限制'] }),
  item(414, 'URI Too Long', '请求 URI 长度超过服务器可处理范围。'),
  item(415, 'Unsupported Media Type', '服务器不支持请求内容的媒体类型或编码。', { common: true, tags: ['Content-Type'] }),
  item(416, 'Range Not Satisfiable', '请求的资源范围无法满足。', { tags: ['Range'] }),
  item(417, 'Expectation Failed', '服务器无法满足 Expect 请求头中的期望。'),
  item(418, '(Unused)', 'HTTP 核心规范将该编号标为未使用；“I’m a teapot”常作为彩蛋实现。', { note: '未使用 / 常见彩蛋', tags: ['teapot', '彩蛋'] }),
  item(421, 'Misdirected Request', '请求被发送到无法为目标 URI 生成响应的服务器。'),
  item(422, 'Unprocessable Content', '请求格式正确，但内容存在语义或校验错误。', { common: true, usage: '表单字段、业务规则或数据关联校验失败。', advice: '返回字段级错误详情，便于客户端准确提示。', tags: ['校验', '表单'] }),
  item(423, 'Locked', '目标资源当前被锁定。', { note: 'WebDAV' }),
  item(424, 'Failed Dependency', '由于相关操作失败，当前请求也无法执行。', { note: 'WebDAV' }),
  item(425, 'Too Early', '服务器不愿处理可能被重放的请求。', { tags: ['TLS', '重放攻击'] }),
  item(426, 'Upgrade Required', '服务器要求客户端切换到响应指定的协议。'),
  item(428, 'Precondition Required', '源服务器要求请求必须带有条件头，以避免更新丢失。', { tags: ['并发控制'] }),
  item(429, 'Too Many Requests', '客户端在限定时间内发送了过多请求。', { common: true, usage: '接口限流、登录保护或防止滥用。', advice: '建议返回 Retry-After，并采用指数退避重试。', tags: ['限流', 'Retry-After'] }),
  item(431, 'Request Header Fields Too Large', '单个或全部请求头字段过大。'),
  item(451, 'Unavailable For Legal Reasons', '由于法律要求，服务器拒绝提供该资源。'),

  item(500, 'Internal Server Error', '服务器遇到未预期的错误，无法完成请求。', { common: true, usage: '未捕获异常、代码缺陷或未知服务端故障。', advice: '记录关联 ID 与完整日志；响应中不要泄露堆栈和内部实现。' }),
  item(501, 'Not Implemented', '服务器不支持完成请求所需的功能。'),
  item(502, 'Bad Gateway', '网关或代理从上游服务器收到无效响应。', { common: true, usage: '反向代理、API 网关或 CDN 的上游服务异常。', advice: '检查上游健康状态、协议、DNS 和代理配置。' }),
  item(503, 'Service Unavailable', '服务器因过载或维护暂时无法处理请求。', { common: true, usage: '计划维护、容量耗尽或依赖服务暂时不可用。', advice: '可返回 Retry-After，并配合熔断、扩容和降级。' }),
  item(504, 'Gateway Timeout', '网关或代理未能及时从上游服务器获得响应。', { common: true, usage: '上游处理过慢、网络超时或代理超时设置过短。', advice: '检查调用链耗时；写操作重试前要确认幂等性。' }),
  item(505, 'HTTP Version Not Supported', '服务器不支持请求使用的 HTTP 版本。'),
  item(506, 'Variant Also Negotiates', '透明内容协商配置形成循环，属于服务器配置错误。'),
  item(507, 'Insufficient Storage', '服务器没有足够存储空间完成请求。', { note: 'WebDAV' }),
  item(508, 'Loop Detected', '服务器在处理请求时检测到无限循环。', { note: 'WebDAV' }),
  item(510, 'Not Extended', '历史扩展状态码，要求进一步扩展请求；登记已废止。', { note: '已废止' }),
  item(511, 'Network Authentication Required', '客户端需要先完成网络访问认证。', { tags: ['Portal', '公共 Wi-Fi'] }),
]
