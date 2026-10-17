import { APP_VERSION, CHANGELOG } from '../changelog'

// 新版本下载好后提示重启，尽快用上新版
export function watchForUpdate() {
  if (!wx.canIUse('getUpdateManager')) return
  const um = wx.getUpdateManager()
  um.onUpdateReady(() => {
    wx.showModal({
      title: '发现新版本',
      content: '新版本已经准备好，重启后即可使用。',
      confirmText: '立即重启',
      cancelText: '稍后',
      success: (r) => {
        if (r.confirm) um.applyUpdate()
      },
    })
  })
}

const SEEN_KEY = 'seenVersion'

// 每个版本只弹一次“本次更新”。新用户（还没设置过昵称）不弹，直接记为已看过
export function showChangelogOnce(isExistingUser: boolean) {
  let seen = ''
  try {
    seen = wx.getStorageSync(SEEN_KEY) || ''
    if (seen === APP_VERSION) return
    wx.setStorageSync(SEEN_KEY, APP_VERSION)
  } catch (e) {
    return
  }
  if (!isExistingUser || !CHANGELOG.length) return
  wx.showModal({
    title: `本次更新（${APP_VERSION}）`,
    content: CHANGELOG.map((x) => `· ${x}`).join('\n'),
    showCancel: false,
    confirmText: '知道了',
  })
}
