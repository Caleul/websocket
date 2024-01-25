import express from 'express'
import http from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import 'dotenv/config'
import { dirname } from 'path';

const __dirname = dirname(import.meta.filename)

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({server})

const APP_PORT = process.env.PORT
const APP_URL = process.env.URL || `http://localhost:${APP_PORT}`

const ACTIONS = {
    ADMIN: 'admin',
    DRAW: 'draw',
    CLIENT_COUNT_UPDATE: 'clientCountUpdate',
}

app.use('/public', express.static('public'))
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'))
app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'))

server.listen(APP_PORT, () => {
    console.log(`Servidor ouvindo a porta ${APP_PORT}!`)
})

let clients = []

wss.on('connection', (ws) => {
    clients.push(ws)
    updateAdminClientCount()

    ws.on('close', () => {
        clients = clients.filter((client) => client !== ws)
        updateAdminClientCount()
    })

    ws.on('message', handleIncomingMessage.bind(null, ws))
})

function handleIncomingMessage (ws, msg) {
    const data = JSON.parse(msg)
    const action = data.action

    switch (action) {
        case ACTIONS.ADMIN:
            ws.isAdmin = true
            break
        case ACTIONS.DRAW:
            handleDraw(data.code)
            break
        default:
            console.warn('Ação desconhecida: ', action)
    }
}

function handleDraw(confirmationCode) {
    let participantes = Array.from(wss.clients).filter((client) => !client.isAdmin)
    const winner = participantes[Math.floor(Math.random() * participantes.length)]

    participantes.forEach((client) => {
        let result = JSON.stringify({ status: 'youlose' })
        if (client === winner) {
            result = JSON.stringify({ status: 'youwin', code: confirmationCode })
        }
        client.send(result)
    })
}

function updateAdminClientCount() {
    const clientCount = Array.from(wss.clients).filter((client) => !client.isAdmin).length

    Array.from(wss.clients).forEach((client) => {
        if (client.isAdmin && client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    action: ACTIONS.CLIENT_COUNT_UPDATE,
                    count: clientCount,
                })
            )  
        }
    })
}
