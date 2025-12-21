# ComfyWUI

一个基于 ComfyUI 的 Web 应用，提供简洁的工作流管理和图像生成界面，同时支持 Google AI (Gemini) 图像生成。

<img width="2780" height="1622" alt="image" src="https://github.com/user-attachments/assets/d4c2e66b-e017-4341-9663-fbaa9d988a32" />


## 核心功能

- 📁 导入和管理 ComfyUI workflows
- 🎨 使用 ComfyUI 工作流生成图片
- 🤖 集成 Google AI (Gemini) 图像生成
- 🖼️ 图片管理（多选、批量删除、查看详情）
- ⚡ 实时 WebSocket 进度更新

## 快速开始

### 前置要求

- **ComfyUI 服务器** 运行在 `http://localhost:8188`
- Python 3.10+ / Node.js 18+（本地部署）
- Docker + Docker Compose（Docker 部署）

### Docker 部署（推荐）

```bash
# 启动
docker-compose up -d

# 查看 API Key
docker-compose logs backend | grep "API Key"

# 停止
docker-compose down
```

访问: http://localhost:3000

### 本地开发

**启动后端**
```bash
cd backend
python -m venv venv

# PowerShell
venv\Scripts\Activate.ps1
# Bash
source venv/bin/activate

pip install -r requirements.txt
python -m app.main
```
后端运行在: http://localhost:8290

**启动前端**（新终端）
```bash
cd frontend
npm install
npm run dev
```
前端运行在: http://localhost:5174

## 使用说明

1. **首次登录**: 输入 API Key（查看后端启动日志）
2. **导入工作流**: Configuration 标签 → Import Workflow JSON
3. **生成图片**: Generation 标签 → 选择模式 → 输入 prompt → Generate
4. **管理图片**: 单击选中、Shift+Click 范围选择、Ctrl+A 全选

## 配置

后端创建 `.env` 文件：
```env
COMFYUI_BASE_URL=http://localhost:8188
PORT=8290
GOOGLE_AI_API_KEY=your_key  # 可选
```

Docker 环境使用 `host.docker.internal:8188` 连接宿主机 ComfyUI

## 常见问题

**ComfyUI 连接失败**
- 确认 ComfyUI 运行在 `http://localhost:8188`
- 检查 `backend/.env` 中的 `COMFYUI_BASE_URL`
- Docker 环境使用 `host.docker.internal:8188`

**API Key 无效**
- 查看后端启动日志获取默认 API Key
- 检查 `backend/data/api_keys.json`

**图片无法显示**
- 检查 `backend/data/images/` 目录权限
- 验证 API Key 在请求中正确传递

## API 文档

启动后端后访问: http://localhost:8290/docs

## 许可证

MIT License
