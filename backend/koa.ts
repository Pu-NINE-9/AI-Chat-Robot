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
router.post('/api/ai', async (ctx) => {
  console.log('Request received:', ctx.request.body) // 打印接收到的请求体

  const { prompt } = ctx.request.body

  if (!prompt || typeof prompt !== 'string') {
    ctx.status = 400
    ctx.body = { error: 'Invalid prompt' }
    return
  }

  try {
    // 发送到 Ollama
    console.log('Sending to Ollama with prompt:', prompt) // 打印发送到 Ollama 的 prompt
    const startTime = new Date().getTime() // 记录开始时间

    const { data } = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:8b',
      prompt: prompt,
      stream: false
    }, {
      timeout: 30000
    })

    const endTime = new Date().getTime() // 记录结束时间
    console.log(`Ollama responded in ${endTime - startTime}ms`) // 打印响应时间

    // 提取 Ollama 响应中的 'response' 字段
    const aiResponse = data.response

    // 返回结果
    ctx.body = {
      status: 200,
      data: aiResponse,
    }

  } catch (error) {
    console.error('Error:', error.message) // 打印错误信息
    console.error('Error details:', error) // 打印错误详细信息
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