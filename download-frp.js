const bent = require("bent")
const os = require("os")
const downloadFile = require("./download-file")
const path = require("path")
const fs = require("fs")
const tar = require("tar")
const compressing = require("compressing")
const getJSON = bent("json", {
  "User-Agent": "seveibar, frpc-bin (an npm module)",
})

const platform = os.platform()

const arch = os.arch()
let osRelease = null

switch (platform) {
  case "win32":
    osRelease = `windows_${arch.replace("x64", "amd64").replace("x32", "386")}`
    break
  case "darwin":
    osRelease = "darwin_amd64"
    break
  case "freebsd":
    osRelease = "freebsd"
    break
  case "linux":
    osRelease = `linux_${arch.replace("x64", "amd64")}`
    break
  // case 'aix': console.log("IBM AIX platform");
  //   break;
  // case 'android': console.log("Android platform");
  //   break;
  // case 'openbsd': console.log("OpenBSD platform");
  //   break;
  // case 'sunos': console.log("SunOS platform");
  //   break;

  default:
    osRelease = `${platform}_${arch}`
}

// Originally derived from the package.json, but that approach doesn't allow for
// any patches to the bindings... Maybe only sync major versions in the future?
// Either that or tag the releases for older version e.g. 1.2.3-frpc6
const releaseVersionToUse = "0.37.0"

module.exports = async () => {
  // Get all the assets from the github release page
  const releaseAPIUrl = `https://api.github.com/repos/fatedier/frp/releases/tags/v${releaseVersionToUse}`
  const githubReleasesJSONPath = path.resolve(__dirname, "github_releases.json")
  let githubReleasesJSON
  if (!fs.existsSync(githubReleasesJSONPath)) {
    githubReleasesJSON = await getJSON(releaseAPIUrl)
    fs.writeFileSync(githubReleasesJSONPath, JSON.stringify(githubReleasesJSON))
  } else {
    githubReleasesJSON = JSON.parse(
      fs.readFileSync(githubReleasesJSONPath).toString()
    )
  }
  const { assets } = githubReleasesJSON

  // Find the asset for my operating system
  const myAsset = assets.find((asset) => asset.name.includes(osRelease))

  if (!myAsset) {
    throw new Error(
      `Couldn't find frp version compatible with ${osRelease},\n\nAvailable releases:\n${assets
        .map((a) => `\t* ${a.name}`)
        .join("\n")}`
    )
  }

  // Download the asset (which is a compressed version of the executable)
  // e.g. download something like frpc-ubuntu.tar.xz

  const downloadPath = path.resolve(__dirname, myAsset.name)
  let extractDirPath;
  if(platform == "win32"){
    extractDirPath = path.resolve(
      __dirname,
      myAsset.name.replace(".zip", "")
    )
  }else{
    extractDirPath = path.resolve(
      __dirname,
      myAsset.name.replace(".tar.gz", "")
    )
  }

  const frpcPath = path.resolve(extractDirPath, "frpc")
  const frpsPath = path.resolve(extractDirPath, "frps")

  if (fs.existsSync(frpcPath) && fs.existsSync(frpsPath)) {
    return { frpsPath, frpcPath }
  }

  if (!fs.existsSync(path.join(__dirname, myAsset.name))) {
    console.log(`Downloading ${myAsset.name}...`)

    await downloadFile(
      myAsset.browser_download_url,
      path.resolve(__dirname, downloadPath)
    )
    await new Promise((r) => setTimeout(r, 100)) // prevents zlib issue
  }

  // Extract the files from the downloaded asset (i.e. pull out the frpc binary)
  // After this, you should have a "frpc" executable file

  if (!fs.existsSync(extractDirPath)) {
    console.log(`extracting ${myAsset.name}...`)
    let tarXPath = downloadPath

    if(platform == "win32"){
      await compressing.zip.uncompress(`${extractDirPath}.zip`,__dirname);
    }else{
      await tar.x({
        file: tarXPath,
        z: true,
      })
    }

    fs.unlinkSync(tarXPath)

    if (!fs.existsSync(frpcPath)) {
      throw new Error(
        `For some reason, after extracting frp there was no frpc executable!`
      )
    }

    if (!fs.existsSync(frpsPath)) {
      throw new Error(
        `For some reason, after extracting frp there was no frps executable!`
      )
    }
  }

  return { frpcPath, frpsPath }
}

if (!module.parent) {
  module.exports().then(() => {})
}
