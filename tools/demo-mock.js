// Demo data for screenshots: stands in for the Tauri core so the real 365MG interface runs in a plain browser.
// Injected before the app loads (tools/capture.mjs). Names are fictional (Contoso → Fabrikam).
(function () {
  var now = Date.now()
  var iso = function (minAgo) { return new Date(now - minAgo * 60000).toISOString() }
  var SKU_BASIC = 'sku-basic', SKU_STD = 'sku-std'
  var people = [
    ['Avery Nguyen', 'avery.nguyen'], ['Blake Tran', 'blake.tran'], ['Casey Le', 'casey.le'], ['Dana Pham', 'dana.pham'],
    ['Eli Hoang', 'eli.hoang'], ['Finley Vo', 'finley.vo'], ['Gray Dang', 'gray.dang'], ['Harper Bui', 'harper.bui'],
    ['Indy Do', 'indy.do'], ['Jordan Ngo', 'jordan.ngo'], ['Kai Duong', 'kai.duong'], ['Logan Ly', 'logan.ly'],
    ['Morgan Ha', 'morgan.ha'], ['Noel Truong', 'noel.truong'], ['Oakley Vu', 'oakley.vu'], ['Parker Lam', 'parker.lam'],
    ['Info mailbox', 'info'], ['Accounting', 'accounting'],
  ]
  var tenants = [
    {
      id: 'src', provider: 'microsoft', display_name: 'Contoso Ltd', default_domain: 'contoso.com', domains: ['contoso.com', 'contoso.onmicrosoft.com'],
      admin_upn: 'admin@contoso.onmicrosoft.com', added_at: iso(60 * 24 * 3),
      check: { checked_at: iso(30), user_count: 214, skus: [{ sku_id: SKU_BASIC, part_number: 'O365_BUSINESS_ESSENTIALS', enabled: 220, consumed: 214 }],
        items: [
          { key: 'admin', label: 'Global administrator', ok: true, detail: 'admin@contoso.onmicrosoft.com' },
          { key: 'graph', label: 'Microsoft Graph', ok: true, detail: 'User.Read.All, Mail, Files' },
          { key: 'exchange', label: 'Exchange Online', ok: true, detail: '214 mailboxes' },
        ] },
    },
    {
      id: 'tgt', provider: 'microsoft', display_name: 'Fabrikam Inc', default_domain: 'fabrikam.com', domains: ['fabrikam.com', 'contoso.com', 'fabrikam.onmicrosoft.com'],
      admin_upn: 'admin@fabrikam.onmicrosoft.com', added_at: iso(60 * 24 * 3),
      check: { checked_at: iso(25), user_count: 120, skus: [
        { sku_id: SKU_BASIC, part_number: 'O365_BUSINESS_ESSENTIALS', enabled: 250, consumed: 118 },
        { sku_id: SKU_STD, part_number: 'O365_BUSINESS_PREMIUM', enabled: 40, consumed: 22 }],
        items: [
          { key: 'admin', label: 'Global administrator', ok: true, detail: 'admin@fabrikam.onmicrosoft.com' },
          { key: 'graph', label: 'Microsoft Graph', ok: true, detail: 'User.ReadWrite.All, Directory' },
          { key: 'exchange', label: 'Exchange Online', ok: true, detail: '120 mailboxes' },
        ] },
    },
    {
      id: 'google:C03xk9', provider: 'google', display_name: 'Northwind Traders', default_domain: 'northwind.com',
      domains: ['northwind.com', 'northwind.vn'], admin_upn: 'admin@northwind.com', added_at: iso(60 * 24),
      check: { checked_at: iso(15), user_count: 86, skus: [],
        items: [
          { key: 'super_admin', label: 'Super admin', ok: true, detail: 'admin@northwind.com' },
          { key: 'users', label: 'Users', ok: true, detail: '86 users' },
          { key: 'mover', label: 'Data mover (service account)', ok: true, detail: 'mg365-mover@mg365-q7k2pd.iam.gserviceaccount.com' },
          { key: 'delegation', label: 'Domain-wide delegation', ok: true, detail: 'Allowed for every scope' },
        ] },
    },
  ]
  var dir = function (tenant, domain) {
    return people.map(function (p, i) {
      return { id: tenant + '-' + i, display_name: p[0], upn: p[1] + '@' + domain, mail: p[1] + '@' + domain, enabled: true,
        licenses: [SKU_BASIC], domain: domain, given_name: p[0].split(' ')[0], surname: p[0].split(' ')[1] || null,
        usage_location: 'VN', proxy_addresses: ['SMTP:' + p[1] + '@' + domain] }
    })
  }
  var srcUsers = dir('src', 'contoso.com')
  // The target already has the first ten people (moved earlier); the rest are created by the campaign.
  var tgtUsers = dir('tgt', 'fabrikam.com').slice(0, 10)

  var options = { mail: true, onedrive: true, contacts: true, calendar: true, schedule: 'interval', interval_hours: 6,
    mail_threads: 12, drive_threads: 10, allow_nonempty_target: false, skip_junk: true, shared_drives: true }
  var campaign = { id: 7, name: 'Contoso → Fabrikam', source_tenant: 'src', target_tenant: 'tgt', created_at: iso(60 * 26),
    status: 'synced', options: options, user_count: 16, last_run_at: iso(95), active_wave: 1, waves: [1, 2], paused: false,
    source_provider: 'microsoft', target_provider: 'microsoft' }
  var cusers = people.slice(0, 16).map(function (p, i) {
    return { source_id: 'src-' + i, source_upn: p[1] + '@contoso.com', source_name: p[0], action: i < 10 ? 'map' : 'create',
      target_id: 'tgt-' + i, target_upn: p[1] + '@fabrikam.com', license_sku: SKU_BASIC, state: 'ready', error: '',
      has_password: i >= 10, mail_state: 'done', drive_state: 'done', run_error: '', wave: i < 10 ? 1 : 2,
      skipped: i === 15, skip_note: i === 15 ? 'Mailbox not active in target' : '' }
  })
  // Texts the core would send, in the page's language (window.__demoText from capture.mjs), English otherwise.
  var T = function (key, vars, fallback) {
    var s = (window.__demoText || {})[key] || fallback
    for (var k in vars) s = s.split('%{' + k + '}').join(vars[k])
    return s
  }
  var issue = function (i, kind, code, count) {
    var u = cusers[i]
    var detail = {
      target_no_mailbox: T('engine.mail.target_no_mailbox', { upn: u.target_upn }, 'The target mailbox of %{upn} is not working.'),
      target_no_drive: T('engine.drive.target_no_drive', { upn: u.target_upn, mb: '1638.4' }, '%{upn} has no OneDrive on the target yet (%{mb} MB to copy).'),
      uncertain_items: T('engine.mail.uncertain_items', { n: count }, '%{n} items with an unknown outcome.'),
      target_fewer: T('engine.mail.target_fewer', { n: count }, 'The target holds %{n} fewer items than were copied.'),
    }[code]
    return { user_id: u.source_id, user_upn: u.source_upn, target_upn: u.target_upn, kind: kind, code: code, detail: detail, count: count || 0, at: iso(20) }
  }
  var issues = [
    issue(11, 'mail', 'target_no_mailbox'), issue(12, 'mail', 'target_no_mailbox'),
    issue(3, 'drive', 'target_no_drive'), issue(13, 'drive', 'target_no_drive'),
    issue(5, 'mail', 'uncertain_items', 3), issue(7, 'mail', 'target_fewer', 253),
  ]
  var job = function (i, kind, state, done, total, bytesDone, bytesTotal, phase) {
    return { user_id: cusers[i].source_id, user_upn: cusers[i].source_upn, kind: kind, state: state, phase: phase,
      items_done: done, items_total: total, bytes_done: bytesDone, bytes_total: bytesTotal, errors: 0, last_error: '',
      idle_seconds: 2, stuck: false }
  }
  var running = false
  var runView = function () {
    return { campaign_id: 7, running: running, started_at: iso(12.5), dry_run: false, wave: null, mail_items_per_min: 1350, drive_mb_per_min: 840,
      jobs: [
        job(0, 'mail', 'running', 18240, 42110, 0, 0, 'Inbox'), job(1, 'mail', 'running', 9120, 11800, 0, 0, 'Sent Items'),
        job(2, 'drive', 'running', 812, 1310, 2.1e9, 3.4e9, ''), job(4, 'mail', 'done', 5310, 5310, 0, 0, ''),
        job(6, 'drive', 'queued', 0, 0, 0, 0, ''), job(8, 'mail', 'queued', 0, 0, 0, 0, ''),
      ] }
  }
  var stats = function (u, i) {
    return { mail_source: 4000 + i * 1731, mail_copied: 4000 + i * 1731 - (i === 7 ? 253 : 0), mail_bytes: (4000 + i * 1731) * 90000,
      mail_rejected: i === 2 ? 1 : 0, mail_uncertain: i === 5 ? 3 : 0, drive_source_bytes: (i + 1) * 7.3e8, drive_files: 300 + i * 41,
      drive_bytes: (i + 1) * 7.3e8 }
  }
  var report = function () {
    var users = cusers.map(function (u, i) {
      var s = stats(u, i)
      return Object.assign({ source_upn: u.source_upn, source_name: u.source_name, target_upn: u.target_upn, wave: u.wave, state: u.state,
        mail_state: u.mail_state, drive_state: u.drive_state, run_error: '', attention: i === 5 ? T('report.attention.uncertain', { n: 3 }, '%{n} messages with unknown result') : '',
        skip_note: u.skip_note }, s)
    })
    var sum = function (k) { return users.reduce(function (a, u) { return a + (u[k] || 0) }, 0) }
    return { campaign: campaign, source_name: 'Contoso Ltd', target_name: 'Fabrikam Inc', generated_at: new Date().toLocaleString(window.__demoLang || 'en'), users: users,
      groups: [
        { source_id: 'g1', source_mail: 'sales@contoso.com', display_name: 'Sales', description: '', kind: 'distribution', target_id: 'tg1', target_mail: 'sales@fabrikam.com', state: 'ready', error: '', members_total: 9, members_added: 9, missing: [] },
        { source_id: 'g2', source_mail: 'support@contoso.com', display_name: 'Support', description: '', kind: 'm365', target_id: 'tg2', target_mail: 'support@fabrikam.com', state: 'ready', error: '', members_total: 6, members_added: 5, missing: ['partner@outlook.com'] },
      ],
      totals: { users: users.length, ready: users.length, mail_source: sum('mail_source'), mail_copied: sum('mail_copied'), mail_bytes: sum('mail_bytes'),
        mail_uncertain: 3, drive_source_bytes: sum('drive_source_bytes'), drive_bytes: sum('drive_bytes'), drive_files: sum('drive_files'),
        mail_done: 15, drive_done: 15, attention: 2, groups_ready: 2 },
      notes: [T('report.notes.uncertain', { n: 3 }, '%{n} messages may or may not have reached the target.'),
        T('report.notes.skipped', { n: 1, list: 'parker.lam@contoso.com' }, '%{n} users skipped by admin decision: %{list}.')] }
  }
  var matchRows = function (ids) {
    return ids.map(function (id) {
      var i = Number(id.split('-')[1])
      return i < 10 ? { source_id: id, candidates: ['tgt-' + i], suggested: 'tgt-' + i, reason: 'address' } : { source_id: id, candidates: [], suggested: null, reason: '' }
    })
  }

  var handlers = {
    app_info: function () { return { name: '365MG', version: '0.7.0', data_dir: 'C:\\Users\\admin\\AppData\\Roaming\\com.tuanhd.365mg' } },
    set_locale: function () { return null },
    dashboard: function () { return { tenants: 2, campaigns: 2, running: running ? 1 : 0, mail_items_per_min: running ? 1350 : 0, drive_mb_per_min: running ? 840 : 0,
      warnings: [T('commands.pending_decisions', { name: 'Contoso → Fabrikam', n: 6 }, 'Campaign "%{name}" has %{n} item(s) that need your decision.')] } },
    tenant_list: function () { return tenants },
    tenant_check: function (a) { return tenants.find(function (t) { return t.id === a.id }) },
    tenant_users: function (a) { return a.id === 'src' ? srcUsers : tgtUsers },
    match_users: function (a) { return matchRows(a.sourceIds) },
    campaign_list: function () { return [campaign, Object.assign({}, campaign, { id: 6, name: 'Northwind → Fabrikam', source_tenant: 'google:C03xk9', source_provider: 'google', status: 'synced', user_count: 42, waves: [1] })] },
    campaign_get: function () { return { campaign: campaign, users: cusers } },
    campaign_create: function () { return 7 },
    run_view: function () { return running ? runView() : null },
    run_start: function () { running = true; campaign.status = 'running'; return null },
    run_pause: function () { running = false; campaign.status = 'paused'; campaign.paused = true; return null },
    run_stop: function () { running = false; return null },
    issues_list: function () { return issues },
    issue_resolve: function (a) { issues = issues.filter(function (i) { return !(i.user_id === a.user && i.code === a.code) }); return issues },
    issues_drive_script: function () { return 'Connect-SPOService -Url https://fabrikam-admin.sharepoint.com\nRequest-SPOPersonalSite -UserEmails dana.pham@fabrikam.com,noel.truong@fabrikam.com' },
    campaign_groups: function () { return report().groups },
    tenant_groups: function () { return [] },
    tenant_shared_drives: function () { return [] },
    campaign_shared_drives: function () { return [
      { source_id: 'd1', source_name: 'Sales / Documents', source_site: 'g1', target_id: 't1', target_name: 'Sales', target_site: 'tg1', state: 'ready', copy_state: 'done', error: '', files: 1840, bytes: 7.6e9, source_bytes: 7.6e9 },
      { source_id: 'd2', source_name: 'Projects / Documents', source_site: 'g2', target_id: null, target_name: '', target_site: '', state: 'pending', copy_state: '', error: '', files: 0, bytes: 0, source_bytes: null },
    ] },
    report_get: function () { return report() },
    report_export: function () { return null },
    settings_get: function () { return { spool_dir: 'D:\\365mg-spool', stuck_minutes: 30 } },
    settings_set: function () { return null },
    update_check: function () { return { current: '0.7.0', channel: true, latest: null, releases: [] } },
  }
  window.__demo = { setRunning: function (v) { running = v; campaign.status = v ? 'running' : 'synced'; campaign.paused = false } }
  window.__TAURI_INTERNALS__ = {
    invoke: function (cmd, args) {
      if (cmd.indexOf('plugin:event') === 0) return Promise.resolve(1)
      if (cmd.indexOf('plugin:') === 0) return Promise.resolve(null)
      var h = handlers[cmd]
      return Promise.resolve(h ? JSON.parse(JSON.stringify(h(args || {}) ?? null)) : null)
    },
    transformCallback: function () { return 1 },
    unregisterCallback: function () {},
    metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
  }
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: function () {} }
  // Clipboard writes stay in the page.
  try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: function () { return Promise.resolve() } }, configurable: true }) } catch (e) {}
})()
