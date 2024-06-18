import { downloadMediaMessage } from "@whiskeysockets/baileys"
import { messageModel } from "../models/messageModel"
import { FormatStandardPhoneNumber } from "../utils/formatter"
import fs from 'fs'
import path from 'path'
import logger from "../utils/logger"

export const messageService = async (message: any, phoneNumber: string) => {
  try {
    const isGroup = message.key.remoteJid?.endsWith('@g.us') == true ? true : false
      const messageType = Object.keys (message.message as Object)[0]
      
      if (!message.key.fromMe) {
        if (messageType === 'conversation'){
          logger.info('got messages', message)
  
          const newMessage = new messageModel({
            remoteJid: message.key.remoteJid as string,
            sender: !isGroup ? FormatStandardPhoneNumber(message.key.remoteJid) : FormatStandardPhoneNumber(message.key.participant) as string,
            senderName: message.pushName,
            recipient: message.key.fromMe ? message.key.remoteJid : phoneNumber,
            message: message.message?.conversation as string || '',
            isGroup: isGroup,
            timestamp: new Date(message.messageTimestamp as number * 1000)
          })
          await messageModel.create(newMessage)
          
        } else if ( messageType === 'imageMessage') {
          const imageName = `${message.key.id}.jpg`

          const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {}
          )

          await fs.promises
            .writeFile(
              path.join(__dirname,`../../public/images/${imageName}`),
              buffer
            )
          
          logger.info('got image', message)
        }
      }
  } catch (error) {
    logger.error(error)
  }
}