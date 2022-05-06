[中文](https://github.com/OvO7000/DeviantArtDownloader/tree/dev#deviantartdownloader)

## DeviantArtDownloader
  - [1. Introduction](#1-Introduction)
  - [2. Install](#2-Installation)
  - [3. Usage](#3-Usage)
  - [4. Settings](#4-Settings)
  
### 1. Introduction
![DeviantArtDownloader logo](https://github.com/OvO7000/DeviantArtDownloader/blob/dev/src/common/images/DeviantArtDownloaderLogo.png)
DeviantArtDownloader is a Chrome extension used to download galleries, favourites from [DeviantArt](https://www.deviantart.com/).
### 2. Installation
#### 2.1 download from chrome web store
You can download from [here](https://chrome.google.com/webstore/detail/deviant-art-downloader/gbfhkaekginiijjfnjlmcaldmjpiajmm/related).
#### 2.2 local installation
1. You can download the extension from [here](https://github.com/OvO7000/DeviantArtDownloader/releases/tag/v1.0.0), inside it is the packaged code。
2. Enter chrome://extensions in the Chrome address bar and click Enter to go to the Chrome extension management page.
3. Open 'Developer mode', click 'Load unpacked', select the unpacked folder, that is the folder where manifest.json is located.
4. A panel of Deviant Art Downloader will appear at the current page, and you can start using the extension after clicking the button in the lower right corner of the panel.
### 3. Usage
1. Open an artist's homepage on DeviantArt, the extension is not available for other pages.
2. Click the icon of DeviantArtDownloader in the upper right corner of the browser, The download panel will be opened.
![DeviantArtDownloader_popup_download](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_popup_download.png)  
    You can select galleries and favourites you want to download, click the download button to start the download.The download process can be paused, canceled or resumed. 
    > Caution: Please close Chrome's option in Settings->Downloads->Ask where to save each file before downloading.  

    > Caution: In order to prevent being banned by deviantArt because of too much request, when the number of deviations in a folder is greater than 100, the download speed will drop to 2s per request. When a download failure occurred in the result file with a 403 response code, this is due to deviantArt forbidding your access.
3. After the download starts, a prompt used to show download progress will appear on the web page, showing the following content:  
![DeviantArtDownloader_content](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_content.png)  
    * Download status
    * The filename which is downloading
    * Download progress of the current gallery
    * Download progress of all galleries
4. The file will be downloaded to the download folder, and a result file with a .txt suffix will be generated to record the file that failed to download and the reason for the failure.
### 4. Settings  
Click the gear button in the upper right corner of the download panel to switch to the settings panel.
![DeviantArtDownloader_popup_settings](https://github.com/OvO7000/images/blob/master/%E5%BC%80%E5%8F%91/DeviationArt%20Downloader/DeviantArtDownloader_popup_settings.png)
#### 4.1 Only download deviations with download icon
By default,a deviation without a download button will grab the image from the web page. When this option is checked, only those deviations with a download button will be downloaded.
#### 4.2 Time range
When 'end time' and 'start time' both are empty, extension will download all deviations.
When 'start time' is empty, extension will download all deviations publishedDate before end time.
When 'end time' is empty, extension will download all deviations publishedDate after start time.
When 'start time' and 'end time' both are specified, extension will download deviations within the time range.
#### 4.3 Filename
The extension supports specifying the downloaded file path and file name by a string. The following is an example, which is also used in the extension's default configuration.
> /deviantArtDownloader/{user}/{folderType}/{folder}/{deviation}  

1. The string should be split by '/', the last part will be used as the file name, and file type will be added to it, the other parts will be used to create corresponding folders.
2. The parts looks like { ... } are variables provided by the extension, they will be replaced with some data, here are some explain:
    * user: name of folder's creator
    * author: name of deviation's creator, when download a favourite folder can use this
    * folder: gallery and favourite collectively referred to as folder
    * folderWithSubFolderName: same with {folder} when the folder hasn't sub galleries, otherwise it will become the form of 'folderName_subFolderName'
    * folderType: could be 'gallery' or 'favourite'
    * deviation: the title of a deviation
    * deviationId: the id of a deviation
    * publishDate: the published date of a deviation
    * downloadDate: the download date of a deviation
    * downloadBy: the way the deviation is downloaded by, could be 'downloadByDownloadLink' or 'downloadByWebImage'
3. When a folder has sub galleries, and a separate '{folder}' exists in the string, that is, the string includes part looks like '.../{folder}/...', directories of sub galleries will be created in the folder. 

#### 4.4 Filename conflict action
Specify how to deal with same filenames:
1. rename with a counter
2. overwriting the existing file

#### 4.5 Auto rename if has error in filename
When this option is checked, the extension will automatically handle the following download failures caused by incorrect filenames:
1. ':*?"<>|' will be auto replaced with '：＊？＂＜＞｜'.
2. Strings longer than 240 will be truncated to 240 characters.
3. '_' will be automatically added after illegal device names, such as CON,PRN,etc.
4. '_' will be used to replace empty filename or directory.
5. '.' at the end of a directory will be auto removed.
