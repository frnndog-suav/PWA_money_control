import { z } from 'zod'

// RF-10 / D-08 — senha do backup: obrigatória, com no mínimo 8 caracteres, e confirmada.

export const BACKUP_PASSWORD_MIN_LENGTH = 8

export const PASSWORD_TOO_SHORT_MESSAGE = `A senha precisa ter pelo menos ${BACKUP_PASSWORD_MIN_LENGTH} caracteres`
export const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'As senhas não coincidem'
export const PASSWORD_REQUIRED_MESSAGE = 'Informe a senha'

/** Exportar: senha (sem `trim`: espaços fazem parte da senha) e confirmação iguais. */
export const exportPasswordSchema = z
  .object({
    password: z.string().min(BACKUP_PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    message: PASSWORDS_DO_NOT_MATCH_MESSAGE,
    // A confirmação é conferida mesmo com a senha ainda curta: o usuário vê os dois erros.
    when: () => true,
  })

export type ExportPasswordValues = z.infer<typeof exportPasswordSchema>

/**
 * Importar: a senha só precisa estar preenchida; a conferência é a descriptografia (CA-10.2).
 * O arquivo é validado só por existir: o conteúdo é conferido ao abrir (CA-10.3).
 */
export const importBackupSchema = z.object({
  file: z.custom<File>((value) => value instanceof Blob, 'Escolha o arquivo do backup'),
  password: z.string().min(1, PASSWORD_REQUIRED_MESSAGE),
})

export type ImportBackupInput = z.input<typeof importBackupSchema>
export type ImportBackupValues = z.output<typeof importBackupSchema>
