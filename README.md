## DeviantArtDownloader
  - [1. 简介](#1-简介)
  - [2. 安装](#2-安装)
  - [3. 使用](#3-使用)
  - [4. 设置](#4-设置)
  
### 1. 简介
![DeviantArtDownloader logo](https://github.com/OvO7000/DeviantArtDownloader/blob/dev/src/common/images/DeviantArtDownloaderLogo.png)
DeviantArtDownloader 是一个用于批量下载 [DeviantArt](https://www.deviantart.com/) 作品、收藏的 chrome 扩展。
### 2. 安装
// todo
### 3. 使用
1. 打开一个 DeviantArt 作者的首页，其他页面无法使用扩展。
2. 点击 DeviantArtDownloader 按钮，会显示下载界面。  
![DeviantArtDownloader_popup_download](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_popup_download.png)  
    可以勾选需要下载的 gallery、favourite，点击 download 按钮进行下载。下载过程可以暂停、取消、继续。  
    > 注意事项：下载前需要关闭 chrome 的 设置>高级>下载内容>下载前询问每个文件的保存位置。
3. 开始下载后，页面上会出现下载进度的提示框，显示以下内容:。  
![DeviantArtDownloader_content](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_content.png)  
    * 下载状态
    * 下载的文件名
    * 当前 gallery 的下载进度
    * 所有 gallery 的下载进度
4. 文件会下载到下载文件夹下，同时会生成一个 .txt 后缀的结果文件，记录下载失败的文件、失败原因。
### 4. 设置  
点击下载界面右上角，可以切换到设置界面。
![DeviantArtDownloader_popup_settings](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_popup_settings.png)
#### 4.1 只下载带有下载按钮的作品
默认情况下，没有下载按钮的作品会从网页上获取图片。勾选该选项后，只会下载那些带有下载按钮的作品。
#### 4.2 时间范围

当没有指定”开始时间“、”结束时间“时，会下载所有作品。  
当只有”开始时间“时，会下载发布时间在“开始时间”之后的作品。  
当只有”结束时间“时，会下载发布时间在”结束时间“之前的作品。  
同时指定”开始时间“、”结束时间“，会下载发布时间在时间范围内的作品。
#### 4.3 文件名
扩展支持通过指定一个字符串来指定下载的文件路径、文件名，下面是一个例子，它也是扩展默认配置中使用的。
> /deviantArtDownloader/{user}/{folderType}/{folder}/{deviation}  

1. 字符串通过”/“分割, 最后一部分会被加上文件类型作为文件名，其他部分会创建对应的文件夹。
2. { ... } 形式的是扩展提供的变量，最终会被替换成作品的一些信息，下面是它们的说明：
    * user: 作者用户名
    * folder: gallery、favourite 名字统称为 folder
    * folderWithSubFolderName: 没有 Sub Gallery 时和 folder 一样，当有Sub Gallery 时则变成”folderName_subFolderName“形式
    * folderType: ”gallery“ 或 ”favourite“
    * deviation: 作品的名字
    * publishDate: 作品发布日期
    * downloadDate: 下载日期
    * downloadBy: 下载方式，”downloadByDownloadLink“ 或 ”downloadByWebImage“
3. 如果存在 Sub Gallery，并且字符串中存在独立的 {folder}, 也就是形如”.../{folder}/...“，该文件夹下会自动创建 Sub Gallery 对应的文件夹。 

#### 4.4 文件名冲突
指定当文件名相同时的处理方式：
1. rename with a counter：自动在文件名后添加数字后缀
2. overwriting the existing file: 覆盖已有文件

#### 4.5 当文件名存在异常时自动处理
勾选该选项后，扩展会自动处理以下由文件名异常导致的下载失败：
1. 当文件名中存在 :*?"<>| 等符号，自动使用 ：＊？＂＜＞｜ 代替。
2. 当文件名是“CON”、“PRN“、”AUX”、“NUL“、”COM1”、“LPT1”等设备名时，会自动追加“_”。
3. 当文件名为空时，会使用“_”作为文件名。
4. 当文件名长度（不包括后缀名）超过 240 个字符时，会自动截取为 240 个字符。
