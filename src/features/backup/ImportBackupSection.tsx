import { useId } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { FileInput } from '@/components/ui/FileInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { IMPORT_LABEL, OPENING_LABEL } from '@/features/backup/backupTexts'
import { ConfirmImportDialog } from '@/features/backup/ConfirmImportDialog'
import { useImportBackup } from '@/features/backup/useImportBackup'

// §6.8 importar, passo 1.
const BACKUP_FILE_ACCEPT = 'application/json,.json'

/** RF-10 importar — arquivo + senha → resumo e confirmação antes de substituir os dados. */
export function ImportBackupSection() {
  const titleId = useId()
  // O ref sai do objeto: o resto é lido na renderização (regra react/refs).
  const { statusRef, ...importer } = useImportBackup()
  const { control } = importer.form

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-lg font-semibold">
        Importar
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Restaura um backup exportado antes. Todos os dados atuais são substituídos.
      </p>
      <form
        key={importer.formKey}
        onSubmit={importer.submit}
        noValidate
        className="flex flex-col gap-3"
      >
        <Controller
          control={control}
          name="file"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Arquivo do backup</Field.Label>
              <FileInput
                accept={BACKUP_FILE_ACCEPT}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onFileChange={field.onChange}
              />
              <Field.Error />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Senha do backup</Field.Label>
              <PasswordInput autoComplete="current-password" enterKeyHint="done" {...field} />
              <Field.Error />
            </Field>
          )}
        />
        {importer.openError && <ErrorAlert>{importer.openError}</ErrorAlert>}
        <Button variant="primary" type="submit" disabled={!importer.canSubmit}>
          {importer.isOpening ? OPENING_LABEL : IMPORT_LABEL}
        </Button>
      </form>
      {/* Fora do formulário (recriado depois de importar), para receber o foco (RNF-06). */}
      <p ref={statusRef} role="status" tabIndex={-1} className="text-sm empty:hidden">
        {importer.message}
      </p>
      <ConfirmImportDialog
        summary={importer.summary}
        onConfirm={importer.confirmImport}
        onCancel={importer.cancelImport}
        isRestoring={importer.isRestoring}
        errorMessage={importer.restoreError}
      />
    </section>
  )
}
