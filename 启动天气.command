#!/bin/bash
# 当地天气 - 一键本地启动脚本
cd "$(dirname "$0")"

PORT=8088

# 检查端口是否被占用，若被占用则递增
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT + 1))
done

echo "========================================="
echo "   🌤️ 当地天气 - 网页版正在启动..."
echo "   本地访问地址: http://localhost:$PORT"
echo "========================================="
echo "提示: 按 Ctrl + C 可关闭本地服务"
echo ""

# 打开系统默认浏览器
sleep 1 && open "http://localhost:$PORT" &

# 启动 Python 内置轻量 HTTP 服务
python3 -m http.server $PORT
