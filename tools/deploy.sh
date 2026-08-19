#!/bin/bash
# deploy.sh — 将本地构建产物 dist 增量推送到服务器并重启服务
#
# 用法：
#   ./tools/deploy.sh             # 增量推送 + 远端重启
#   ./tools/deploy.sh --dry-run   # 只看会传哪些文件，不实际推送
#
# 说明：
#   · 使用 rsync over SSH：--partial 支持断点续传，-z 传输压缩，
#     未变化的文件（内容哈希不变）自动跳过，日常小改推送通常为秒级
#   · 服务器认证使用 SSH 公钥（首次运行前需已配置免密，见《配图工作流技术方案》部署章节）
#   · --delete 会删除服务器上本地已不存在的文件（如旧哈希的 JS），保持两端一致

set -euo pipefail

SERVER="root@159.75.81.126"
LOCAL_DIST="$(cd "$(dirname "$0")/.." && pwd)/docs/.vuepress/dist/"
REMOTE_DIR="/root/LoranBlog/dist/"

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "== DRY RUN 模式，仅预览 =="
fi

# 带宽保护：限速 8Mbps（服务器带宽小，避免推送时打满影响线上访问；按需调整）
BWLIMIT="--bwlimit=8192"

echo "==> 推送 $LOCAL_DIST -> $SERVER:$REMOTE_DIR"
rsync -avz --partial --delete $BWLIMIT $DRY_RUN \
    --exclude '.DS_Store' \
    "$LOCAL_DIST" "$SERVER:$REMOTE_DIR"

if [[ -z "$DRY_RUN" ]]; then
    echo "==> 重启远端服务"
    # 服务器上 pm2 托管的 http-server（cwd=/root/LoranBlog/dist, 端口 80）按请求读盘，
    # 静态内容更新其实无需重启；重启一次仅为兜底（清掉任何句柄/缓存残留）。
    # 注意：/root/LoranBlog/start.sh 内容全是注释，不能用它启动。
    ssh "$SERVER" "export PATH=/root/.nvm/versions/node/v16.20.2/bin:\$PATH && pm2 restart LoranBlog"
    echo "==> 完成"
fi
