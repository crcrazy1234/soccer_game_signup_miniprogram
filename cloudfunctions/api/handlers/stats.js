// “我的”页统计：按球队分别统计出勤和罚款
const { db, _, listAll } = require('../lib/db')
const { FINE_REASONS } = require('../lib/rules')

async function myStats({ openid }) {
  const members = await listAll(db.collection('members').where({ openid }))
  if (!members.length) return { clubs: [] }
  const clubs = (await listAll(db.collection('clubs').where({ _id: _.in(members.map((m) => m.clubId)) }))).filter(
    (c) => !c.archived,
  )
  if (!clubs.length) return { clubs: [] }
  const clubIds = clubs.map((c) => c._id)

  const [regs, fines] = await Promise.all([
    listAll(db.collection('registrations').where({ openid, clubId: _.in(clubIds) })),
    listAll(db.collection('fines').where({ openid, clubId: _.in(clubIds) })),
  ])
  const gameIds = [...new Set(regs.map((r) => r.gameId))]
  const games = gameIds.length ? await listAll(db.collection('games').where({ _id: _.in(gameIds) })) : []
  const gameById = Object.fromEntries(games.map((g) => [g._id, g]))
  const now = Date.now()

  return {
    clubs: clubs.map((c) => {
      // 只算正常进行的比赛（取消、删除的比赛不算）
      const mine = regs.filter((r) => {
        const g = gameById[r.gameId]
        return r.clubId === c._id && g && g.status === 'active' && !g.archived
      })
      const played = mine.filter((r) => r.status === 'registered' && gameById[r.gameId].endAt < now)
      const count = (att) => played.filter((r) => r.attendance === att).length
      const myFines = fines.filter((f) => f.clubId === c._id && f.status !== 'waived')
      const byReason = {}
      for (const f of myFines) {
        const label = f.detail || FINE_REASONS[f.reason] || f.reason
        byReason[label] = (byReason[label] || 0) + 1
      }
      const sum = (list) => list.reduce((s, f) => s + f.amountCents, 0)
      return {
        clubId: c._id,
        clubName: c.name,
        finesEnabled: !c.settings || c.settings.finesEnabled !== false,
        attendance: {
          played: played.length,
          onTime: count('on_time'),
          late: count('late'),
          noShow: count('no_show'),
          cancelled: mine.filter((r) => r.status === 'cancelled').length,
          upcoming: mine.filter((r) => r.status === 'registered' && gameById[r.gameId].endAt >= now).length,
        },
        fines: {
          byReason: Object.entries(byReason).map(([reason, n]) => ({ reason, n })),
          totalCents: sum(myFines),
          paidCents: sum(myFines.filter((f) => f.status === 'paid')),
          pendingCents: sum(myFines.filter((f) => f.status === 'pending')),
        },
      }
    }),
  }
}

module.exports = { myStats }
