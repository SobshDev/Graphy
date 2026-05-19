import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

import {
  cancelClose,
  confirmCloseDiscard,
  confirmCloseSave,
  usePendingCloseTab,
} from '../lib/open-file'

export function UnsavedChangesDialog() {
  const tab = usePendingCloseTab()
  const open = tab !== null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancelClose()
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Save changes to {tab?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes will be lost if you don&apos;t save them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            variant="ghost"
            onClick={() => confirmCloseDiscard()}
          >
            Don&apos;t save
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void confirmCloseSave()}>
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
