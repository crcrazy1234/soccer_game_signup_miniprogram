import { ENV_ID } from './config'
import { watchForUpdate } from './utils/update'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    wx.cloud.init({ env: ENV_ID || undefined, traceUser: true })
    watchForUpdate()
  },
})
