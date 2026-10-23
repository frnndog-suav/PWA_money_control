import { useId } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { EXPORT_LABEL, EXPORTING_LABEL, SAVE_FILE_LABEL } from '@/features/backup/backupTexts'
import { useExportBackup } from '@/features/backup/useExportBackup'

/** RF-10 exportar — senha + confirmação (mínimo 8 caracteres) e "Exportar backup". */
export function ExportBackupSection() {
  const titleId = useId()
  // Os refs saem do objeto: o resto é lido na renderização (regra react/refs).
  const { statusRef, saveButtonRef, ...exporter } = useExportBackup()
  const { control } = exporter.form

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-lg font-semibold">
        Exportar
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Gera um arquivo com todos os dados, protegido pela senha. Guarde a senha: sem ela não dá
        para restaurar o backup.
      </p>
      <form onSubmit={exporter.submit} noValidate className="flex flex-col gap-3">
        {/* Controlados (Controller), como no formulário de lançamento (D-39): o `reset` depois
            de exportar limpa os campos mesmo com o React Compiler. */}
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Senha</Field.Label>
              <PasswordInput autoComplete="new-password" enterKeyHint="next" {...field} />
              <Field.Error />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="confirmation"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Confirmar senha</Field.Label>
              <PasswordInput autoComplete="new-password" enterKeyHint="done" {...field} />
              <Field.Error />
            </Field>
          )}
        />
        {exporter.error && <ErrorAlert>{exporter.error}</ErrorAlert>}
        <p ref={statusRef} role="status" tabIndex={-1} className="text-sm empty:hidden">
          {exporter.message}
        </p>
        {exporter.pendingFile ? (
          <Button
            ref={saveButtonRef}
            variant="primary"
            disabled={exporter.isBusy}
            onClick={exporter.savePendingFile}
          >
            {SAVE_FILE_LABEL}
          </Button>
        ) : (
          <Button variant="primary" type="submit" disabled={!exporter.canSubmit}>
            {exporter.isGenerating ? EXPORTING_LABEL : EXPORT_LABEL}
          </Button>
        )}
      </form>
    </section>
  )
}
