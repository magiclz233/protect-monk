# 通用图片 API 适配

本技能不保存或绑定任何服务商。优先使用宿主已有的图片生成连接器；只有宿主明确提供 HTTP/API 能力时，才使用下面的通用协议。

## 配置

从环境变量或宿主安全配置中读取：

| 配置 | 用途 |
| --- | --- |
| `PIXEL_IMAGE_API_BASE_URL` | API 基础地址，不包含 `/images/generations` |
| `PIXEL_IMAGE_API_KEY` | 用户预先配置的凭据 |
| `PIXEL_IMAGE_MODEL` | 实际模型名，由用户按服务商选择 |
| `PIXEL_IMAGE_API_PROTOCOL` | 默认 `openai-images` |

不要要求用户在聊天中发送 Key。不要打印认证头、Cookie、完整环境变量或包含密钥的请求体。

## 文生图

兼容接口：

```text
POST {BASE_URL}/images/generations
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "model": "{MODEL}",
  "prompt": "{PROMPT}",
  "size": "{WIDTHxHEIGHT}",
  "n": 1,
  "response_format": "b64_json"
}
```

不同服务可能不接受 `response_format`、透明背景或任意尺寸。遇到参数错误时，只调整该服务明确支持的字段，不改角色设定和网格要求。

## 图生图

兼容接口：

```text
POST {BASE_URL}/images/edits
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data

model={MODEL}
prompt={PROMPT}
image=@{REFERENCE_FILE}
size={WIDTHxHEIGHT}
response_format=b64_json
```

一次只传任务真正需要的参考图。方向动作使用对应方向图，换皮使用原序列图，不能把所有素材无差别地一起上传。

## 响应处理

优先支持：

- `data[0].b64_json`：本地解码并校验真实图片格式。
- `data[0].url`：下载到新文件，校验 MIME、尺寸和 SHA-256。

保存后必须重新打开图片确认可读。不要只根据 HTTP 200 或 JSON 里有 URL 就报告成功。

## 能力探测

提交前尽量确认：

- 是否支持图生图。
- 是否支持目标宽高比和分辨率。
- 是否支持透明背景。
- 单次是否支持多图。
- 是否有内容审核或并发限制。

无法确认时先用一张低风险样图验证；用户没有授权付费测试时，不生成。

## 非 OpenAI 兼容服务

Google Gemini 原生 API、ComfyUI、Stability、Midjourney 等接口协议不同。按以下原则处理：

- 当前聊天产品有原生生图工具：直接用原生工具，不绕 HTTP。
- 宿主有该服务的专用连接器：用连接器。
- 只有普通网页：输出提示词让用户在网页中生成，不声称已代操作。
- 需要自定义适配器：适配器只负责协议转换，角色母图、方向选择和序列验收仍按本技能执行。

## 费用与失败

- 付费前核对模型、数量、分辨率和预算。
- 一次提交没有明确结果时保留请求状态，不重复扣费。
- 失败后不自动切换到更贵模型。
- 下载失败只重试下载，不重新生成。
