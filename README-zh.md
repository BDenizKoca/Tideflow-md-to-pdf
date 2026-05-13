<div align="center">

# Tideflow

<img width="1920" height="1032" alt="tideflowv1" src="https://github.com/user-attachments/assets/d4d88097-a895-458b-8e75-770398452e0b" />

**快速、离线优先的 Markdown → PDF 桌面应用，由 Typst 驱动**

在左侧编写，右侧即时获得精美排版的 PDF。

[![CI](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/ci.yml)
[![Release](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/release.yml/badge.svg)](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 为什么开发这个工具

我想要一个简单、优雅的写作工具，能够输出印刷级 PDF，**无需依赖网络服务**、LaTeX 工具链或繁重的导出过程。这就是 TideFlow —— 一个用于快速编辑 Markdown 并将其格式化为 PDF 的简单编辑器。

## 适用人群

Tideflow 专为喜欢使用 Markdown 写作，并希望有可靠方式生成格式良好 PDF 文档的人设计。

它可能对以下人群有用：

- 以 Markdown 撰写长篇内容并需要干净导出流程的作者
- 希望获得结构化文档而无需维护复杂 LaTeX 环境的研究人员
- 已经熟悉基于 Markdown 工具的开发人员
- 准备 PDF 格式报告或技术文档的专业人士

Tideflow 的目标不是替代高级发布系统。相反，它专注于提供从 Markdown 文本到印刷级 PDF 的实用、轻量级路径。

如果你经常使用 Markdown 写作并以 PDF 形式分发你的工作成果，Tideflow 可以让这个过程变得简单且可预测。

## 功能特性

- 编辑器与 PDF 预览之间的实时双向滚动同步（准确率约 85%）
- 简洁、无干扰的编辑体验
- 离线优先 —— 无需网络连接
- 基于 Typst 的高质量排版
- 支持多种导出格式
- 跨平台支持（Windows、macOS、Linux）

## 快速开始

### 安装

从 [Releases](https://github.com/BDenizKoca/Tideflow-md-to-pdf/releases) 页面下载适合你操作系统的安装包。

### 基本使用

1. 启动 Tideflow
2. 在左侧编辑器中编写 Markdown
3. 右侧实时预览 PDF 效果
4. 使用工具栏导出 PDF

## Markdown 语法支持

Tideflow 支持标准 Markdown 语法以及一些扩展功能：

### 基础语法

```markdown
# 一级标题
## 二级标题
### 三级标题

**粗体文本**
*斜体文本*
~~删除线文本~~

- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2

> 引用文本

[链接文本](https://example.com)
![图片描述](image.png)
```

### 代码块

````markdown
```python
def hello():
    print("Hello, World!")
```
````

### 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
```

### 数学公式

Tideflow 支持 LaTeX 数学公式：

```markdown
行内公式：$E = mc^2$

块级公式：
$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

## 导出选项

- **PDF**：高质量印刷级 PDF
- **其他格式**：支持多种导出格式

## 配置

Tideflow 提供多种配置选项：

- 主题设置（亮色/暗色）
- 字体选择
- 页面大小和边距
- 导出质量设置

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+P | 导出 PDF |
| Ctrl+F | 查找 |
| Ctrl+H | 替换 |

## 常见问题

### 如何安装？

从 [Releases](https://github.com/BDenizKoca/Tideflow-md-to-pdf/releases) 页面下载适合你操作系统的安装包，然后按照安装向导进行安装。

### 支持哪些操作系统？

Tideflow 支持 Windows、macOS 和 Linux。

### 如何导出 PDF？

在编辑器中编写 Markdown 后，点击工具栏的导出按钮或使用快捷键 Ctrl+P 导出 PDF。

### 支持数学公式吗？

是的，Tideflow 支持 LaTeX 数学公式语法。

## 许可证

MIT

---

> 项目地址：[BDenizKoca/Tideflow-md-to-pdf](https://github.com/BDenizKoca/Tideflow-md-to-pdf)
