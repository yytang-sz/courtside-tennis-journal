# 部署说明 / Deployment

本仓库是可独立部署的源码。下载源码不会获得作者的云端账号、数据库或球员记录。`site/cloud-config.js` 默认环境 ID 为空，云函数白名单为空时拒绝所有用户。

## 1. 准备自己的云环境

在自己的腾讯云账号中建立上海（`ap-shanghai`）CloudBase **文档型数据库**环境。本项目使用文档型数据库接口，不使用 PostgreSQL。实名认证、服务协议与应用账号密码由部署者本人完成。

启用用户名密码登录，在「身份认证 → 用户管理」创建教练用户。记下该应用用户的 UID；它不是腾讯云账号 UIN。无需将管理员 SecretId/SecretKey 写入网页。

## 2. 创建数据库集合

创建三个集合：

- `tennis_players`
- `tennis_matches`
- `tennis_meta`

每个集合的浏览器安全规则均为：

```json
{"read": false, "write": false}
```

`database-rules.json` 提供逐集合参考。前两个集合建立复合索引：`ownerId` 升序、`recordId` 升序。私人数据由云函数读写，浏览器不能直接访问。

## 3. 部署云函数

创建 Node.js 云函数 `tennisJournal`，入口 `index.main`，使用 `functions/tennisJournal/` 目录中的代码并安装其依赖。已验证过的运行时为 Nodejs20.19；以平台实际支持列表为准。

设置服务端环境变量 `COACH_UIDS` 为获准教练的应用 UID；多个 UID 用逗号分隔。**保持 Event/SDK 调用，不添加匿名 HTTP 触发器**。账号身份来自可信运行上下文，前端传入的 uid/ownerId 不作为授权依据。

若使用官方 CloudBase CLI，可复制 `cloudbaserc.example.json` 为 `cloudbaserc.json`，填写自己的环境 ID 和白名单，再按官方 CLI 文档部署。真实配置文件已加入 `.gitignore`。

## 4. 配置并上传网页

```bash
python3 configure.py --env-id YOUR_ENV_ID --output-dir configured-site
```

输出目录必须不存在，脚本不会覆盖现有目录。它只生成新的静态网页文件，不创建云资源、不上传数据。

将 `configured-site/` 内的文件部署到自己的 HTTPS 静态托管，为网站配置精确安全域名。**只上传静态网站目录**，不要把云函数、测试文件和管理员配置作为网站发布。浏览器 SDK 已随网站打包，无需外部代码 CDN。

## 5. 验收与使用

- 登录白名单内的账号，保存一位虚构测试球员及比赛，再点击「刷新云端」核对数据。
- 用另一台设备登录同一账号，核对人数、场次、分值与备注。
- 未登录及不在白名单内的账号必须被拒绝；浏览器直接访问三个集合也必须失败。
- 大陆 Wi-Fi 与移动网络需分别实际测试打开、登录、保存和重新读取。
- 免费套餐执行时间等限制可能导致超时。看到云端确认前不应视为保存成功；保留输入后安全重试，不要放开数据权限来解决超时。
- 原本地版的数据需在原设备导出 JSON，再在云端版手动确认导入；不会自动迁移。内置示例会被跳过。
- iPad/iPhone 可在 Safari 中「分享 → 添加到主屏幕」。网页需要网络连接；它不提供完整离线编辑同步。
- 定期导出 JSON 备份。云服务期限、额度、费用、默认域名提示及备案要求以官方规则为准，不保证永久免费或永久有效链接。

## English

Create your own Shanghai document-mode CloudBase environment, enable username/password authentication, and create a coach user. Deny direct browser reads and writes on the three collections. Deploy the `tennisJournal` event function with its dependencies and configure `COACH_UIDS` on the server. Generate a new configured website folder with `configure.py`, host only that folder over HTTPS, and allow the precise website domain. Test authenticated persistence, unauthorized rejection and the intended networks/devices before entering real data.

## 官方参考 / Official references

- [CloudBase environment setup](https://docs.cloudbase.net/quick-start/create-env)
- [Static hosting](https://docs.cloudbase.net/hosting/quick-start)
- [Default domain limitations](https://docs.cloudbase.net/service/alias)
- [Database security rules](https://cloud.tencent.com/document/api/876/128959)
- [CloudBase CLI](https://docs.cloudbase.net/cli-v1/quick-start)
