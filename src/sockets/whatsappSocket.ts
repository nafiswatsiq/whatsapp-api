import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, delay, AuthenticationState, AnyMessageContent } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom"
import path from 'path';
import * as fs from 'fs'
import { FormatToPhoneNumber, FormatToWhatsappJid } from "../utils/formatter";
const AUTH_FILE_LOCATION = '../../data/session'

export class whatsappSocket {
  qrcode: string = ""
  phoneNumber: string = ""
  sock: any
  state: AuthenticationState | null = null
  saveCreds: any
  needRestartSocket: boolean = false

  constructor() {
    // this.init()
  }

  async Initialize() {
    this.sock = await this.createNewSocket()
  }

  async createNewSocket() {
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FILE_LOCATION);
    this.state = state
    this.saveCreds = saveCreds

    var socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.macOS('Desktop'),
      getMessage: async (key) => {
        return { conversation: { jid: key } } as any
      },
    })
  
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update
  
      console.log('connection update', connection, lastDisconnect, qr, isNewLogin)
      if (qr !== undefined) {
        this.qrcode = qr as string
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
  
        if (shouldReconnect) {
          this.sock = await this.createNewSocket()
        } else {
          fs.rmSync(AUTH_FILE_LOCATION, { force: true, recursive: true })
          this.needRestartSocket = true
          console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        }
      } else if (connection === 'open') {
        console.log('opened connection')
        this.phoneNumber = FormatToPhoneNumber(this.state?.creds?.me?.id as string | null | undefined)
        this.qrcode = ""
      }
    })
  
    socket.ev.on('creds.update', saveCreds)
    
    return socket
  }

  async sendTextMessage(phoneNumber: string | null | undefined, message: AnyMessageContent) {
    console.log('send message to', phoneNumber, message)

    const jid = FormatToWhatsappJid(phoneNumber)

    await this.sock.presenceSubscribe(jid)
    await delay(500)
    await this.sock.sendPresenceUpdate('composing', jid)
    await delay(2000)
    await this.sock.sendPresenceUpdate('available', jid)
    await delay(100)
    await this.sock.sendMessage(jid, message)
  }

  getStatus() {
    if(this.needRestartSocket) {
      return {
        isConnected: false,
        phoneNumber: "",
        qrcode: "",
        needRestartSocket: true
      }
    }
    if(this.qrcode === "") {
      return {
        isConnected: true,
        phoneNumber: this.phoneNumber,
        qrcode: "",
        needRestartSocket: false
      }
    }
    return {
      isConnected: false,
      phoneNumber: "",
      qrcode: this.qrcode,
      needRestartSocket: false
    }
  }
}