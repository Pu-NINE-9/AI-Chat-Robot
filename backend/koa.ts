const Koa = require('koa')
const app = new Koa()
const Router = require('koa-router')
const router = new Router()
const cors = require('@koa/cors')
const axios = require('axios')
const bodyParser = require('koa-bodyparser')
const { spawn } = require('child_process')

// 中间件配置
app.use(cors())
app.use(bodyParser())

// 启动 Ollama 服务
const ollamaService = spawn('ollama', ['serve'], {
  stdio: 'inherit',
  cwd: 'D:\\software\\programming\\WebStorm 2024.1\\code\\AI-chat-robot\\backend'
})

ollamaService.on('error', (err) => {
  console.error(`启动 Ollama 服务失败: ${err}`)
})

ollamaService.on('exit', (code, signal) => {
  if (code) console.error(`Ollama 服务退出，退出码: ${code}`)
  else if (signal) console.error(`Ollama 服务被信号 ${signal} 终止`)
  else console.log('Ollama 服务已启动')
})

// 具体业务代码逻辑
// 修改后的后端代码（流式输出版本）
router.post('/api/ai-stream', async (ctx) => {
  console.log('Request received:', ctx.request.body)

  const { prompt } = ctx.request.body

  if (!prompt || typeof prompt !== 'string') {
    ctx.status = 400
    ctx.body = { error: 'Invalid prompt' }
    return
  }

  try {
    console.log('Sending to Ollama with prompt:', prompt)
    const startTime = new Date().getTime()

    // 设置响应头为流式传输
    ctx.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // 创建可写流
    ctx.body = require('stream').Readable({
      read() {}
    })

    // 调用Ollama的流式API
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'OhHaewon',
      prompt: prompt,
      stream: true  // 启用流式输出
    }, {
      responseType: 'stream',
      timeout: 300000
    })

    // 将Ollama的流式响应转发给客户端
    response.data.on('data', (chunk) => {
      const data = chunk.toString()
      try {
        const parsed = JSON.parse(data)
        if (parsed.response) {
          ctx.res.write(`data: ${JSON.stringify({ content: parsed.response })}\n\n`)
        }
      } catch (e) {
        console.error('Error parsing chunk:', e)
      }
    })

    response.data.on('end', () => {
      console.log(`Ollama stream completed in ${new Date().getTime() - startTime}ms`)
      ctx.res.end()
    })

    response.data.on('error', (err) => {
      console.error('Stream error:', err)
      ctx.res.end()
    })

  } catch (error) {
    console.error('Error:', error.message)
    ctx.status = 500
    ctx.body = {
      error: 'AI 服务暂不可用',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  }
})

app.use(router.routes())
app.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
})