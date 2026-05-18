import { useState } from 'react'
import { FolderSearch } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/switch'

import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

export function SectionAccount() {
  const [workspace, setWorkspace] = useState('graphy-personal')
  const [projectPath, setProjectPath] = useState('~/projects')
  const [sync, setSync] = useState(true)

  return (
    <SettingCard>
      <SettingRow label="Workspace">
        <Input
          value={workspace}
          onChange={(event) => setWorkspace(event.target.value)}
          className="bg-background/60 h-8 max-w-[220px] font-mono text-[12.5px]"
        />
      </SettingRow>

      <SettingRow label="Default project path">
        <div className="flex items-center gap-2">
          <Input
            value={projectPath}
            onChange={(event) => setProjectPath(event.target.value)}
            className="bg-background/60 h-8 w-[200px] font-mono text-[12.5px]"
          />
          <Button variant="outline" size="sm">
            <FolderSearch className="size-3.5" strokeWidth={1.7} />
            browse
          </Button>
        </div>
      </SettingRow>

      <SettingRow label="Cloud sync">
        <Switch
          checked={sync}
          onCheckedChange={setSync}
          aria-label="Cloud sync"
        />
      </SettingRow>
    </SettingCard>
  )
}
