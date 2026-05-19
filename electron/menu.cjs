const { Menu, app } = require('electron')

function buildMenu({
  onOpenFolder,
  onCloseFolder,
  onReload,
  onOpenRecent,
  onClearRecents,
  recents,
  hasOpenFolder,
}) {
  const isMac = process.platform === 'darwin'
  const appName = app.getName()

  const recentItems =
    recents.length === 0
      ? [{ label: 'No Recent Folders', enabled: false }]
      : [
          ...recents.map((folder) => ({
            label: folder,
            click: () => onOpenRecent(folder),
          })),
          { type: 'separator' },
          { label: 'Clear Menu', click: () => onClearRecents() },
        ]

  const fileMenu = {
    label: 'File',
    submenu: [
      {
        label: 'Open Folder…',
        accelerator: 'CmdOrCtrl+O',
        click: () => onOpenFolder(),
      },
      {
        label: 'Open Recent',
        submenu: recentItems,
      },
      { type: 'separator' },
      {
        label: 'Close Folder',
        accelerator: 'Shift+CmdOrCtrl+W',
        enabled: hasOpenFolder,
        click: () => onCloseFolder(),
      },
      {
        label: 'Reload Graph',
        accelerator: 'CmdOrCtrl+R',
        enabled: hasOpenFolder,
        click: () => onReload(),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  }

  const template = [
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    fileMenu,
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: isMac
        ? [
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ]
        : [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ]

  return Menu.buildFromTemplate(template)
}

function applyMenu(options) {
  Menu.setApplicationMenu(buildMenu(options))
}

module.exports = { applyMenu }
