import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { getStatus, sendTextMessage as sendMessage } from '../sockets/whatsappSocket'

export const sendTextMessage = async (req: Request, res: Response) => {
  await body('phoneNumber')
    .notEmpty().withMessage('Nomor telepon tidak boleh kosong')
    .matches(/^[0-9]+$/, 'g').withMessage('Nomor telepon hanya boleh berisi angka')
    .isLength({ min: 10, max: 15 }).withMessage('Nomor telepon harus berisi 10-15 karakter')
    .trim()
    .run(req)

  await body('message')
    .isObject()
    .withMessage('Pesan harus berupa object')
    .run(req)

  await body('message.text')
    .notEmpty().withMessage('Pesan tidak boleh kosong')
    .run(req)

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: true, 
      message: errors.array() 
    })
  }

  const status = getStatus()
  if(!status?.isConnected) {
    return res.status(400).json({ 
      error: true,
      message: 'Koneksi ke WhatsApp belum terhubung'
    })
  }

  const phoneNumber = req.body.phoneNumber
  const message = req.body.message

  sendMessage(phoneNumber, message)

  return res.status(200).json({ 
      error: false, 
      message: 'Pesan berhasil dikirim'
    })
}