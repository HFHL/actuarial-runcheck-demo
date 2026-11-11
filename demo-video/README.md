# Actuarial Review Workspace 演示

`public/frames` 存放从本地模拟工作区实拍的浏览器画面。`script.json` 是中文旁白和字幕文案，`timeline.json` 包含时间轴和字幕。`capture.json` 记录各画面的操作位置。

```sh
npm ci
npm run studio
npm run render
```

如需修改旁白并重新对齐画面，在 macOS 安装 Tingting 中文语音及 FFmpeg 后，运行 `python3 prepare-audio.py`。
