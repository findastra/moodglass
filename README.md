# Moodglass

Turn your Discord photo chats into backgrounds. Click **✎**, then add a chat with **+**, then click its button for a new, edge-to-edge mosaic. **⏻** turns every background off and back on. Each NASA click brings in a new James Webb image from NASA.

## Install

1. Install BetterDiscord from [betterdiscord.app](https://betterdiscord.app/).
2. Download [moodglass-20261024.plugin.js](https://github.com/findastra/moodglass/releases/latest/download/moodglass-20261024.plugin.js). It saves straight to your Downloads folder. **Don't double-click it.** Windows would try to run it with Windows Script Host and show a "Syntax error / JavaScript compilation error" box. That box is harmless (click OK); the file only works inside BetterDiscord.
3. Open your BetterDiscord plugins folder, `C:\Users\<you>\AppData\Roaming\BetterDiscord\plugins`. Any of these gets you there:
   - In Discord: **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
   - In [Everything](https://www.voidtools.com/) search: type `betterdiscord`, open the **BetterDiscord** folder in `AppData\Roaming`, then its **plugins** folder.
   - In File Explorer: paste `%APPDATA%\BetterDiscord\plugins` into the address bar and press Enter.

   Drag the downloaded `moodglass-20261024.plugin.js` from Downloads into that folder, then turn on **Moodglass** in Discord's BetterDiscord → Plugins list.
4. Click **✎** at the top right, then **+**. Click a chat in Discord, or navigate to it and choose **Use this open chat**.

If the earlier Astra Mood Boards / Astra NASA Photos prototypes are still turned on, Moodglass turns them off when it starts, because they draw their own background over it. You can delete their files from the plugins folder.

## Use

- **Channel buttons:** reconcile that channel's accessible photo history and choose a new mosaic. Each click reads the newest photos (up to 150 photos or 3,000 messages back, so big chats can't crash Discord), adds new ones, and removes deleted attachments from the background selection. Up to 12 photos show at once. An empty photo chat clears the background. Failed refreshes keep the previous selection and show an error.
- **+**: add a server text channel, direct-message chat, or individual thread that your Discord client can access. For forums, add an individual post. A DM's button is named after the other person's profile name. If a name is longer than 20 letters, Moodglass asks you to type a shorter one.
- **✎**: show a minus next to each category and reveal **+**. Click a minus to remove that category; click the pencil again to finish. Removal does not delete Discord posts or cached files. A removed NASA category can be restored through **+ → Add NASA**.
- **NASA**: each click downloads a new James Webb image from NASA's [Webb image gallery](https://science.nasa.gov/mission/webb/multimedia/images/), saves it to the `moodglass-stars` folder in your plugins folder (your star library) and fills the window with it. The first four clicks bring in the classics: Cosmic Cliffs, Rho Ophiuchi and two Pillars of Creation views. After that, each click picks a random Webb sky image (compass, chart, diagram and hardware images are skipped, and anything under 3840 pixels). Originals over 8K are stored as high-quality 8K (7680 px) JPEGs to keep Discord from running out of memory. If NASA can't be reached, a photo from your library is shown. Put your own space pictures in `moodglass-stars` and they can show up too.
- **⏻**: turn all mood boards off so Discord looks normal; only the power button stays. Click it again to turn them back on. The choice is saved.
- **Blurred borders:** use the checkbox at the top to blend photo edges or show crisp borders. The choice is saved and applies immediately without loading different photos. Enabled by default.
- **Resize:** the current photos rearrange without changing. Mosaic tiles crop to fill their space, with no gaps or repeated image content in a layout.

No timed slideshow or background channel polling. A click starts a finite import; removing the category cancels its import. Webb originals can be over 100 MB, so a NASA click can take a few seconds.

## What is stored

Only image attachments from chats you explicitly add are imported. The plugin stores image files in `moodglass-cache` inside your BetterDiscord plugins directory, and channel IDs, category labels, attachment IDs and image hashes in BetterDiscord's local data storage. It does not save message text, read account tokens, send messages, or upload photos. Your personal channels, images and configuration are not part of this repository or download.

PNG, JPEG, WebP, GIF and AVIF attachments are supported. Photos larger than 2048 pixels are downloaded as resized copies from Discord's image server; files over 20 MB that can't be resized are skipped. External image embeds and linked web galleries are not imported. Deleted attachments are removed from the selectable library after a successful refresh; downloaded files remain on disk. Removing a category keeps its cache for re-adding later.

## Webb sources and credits

Images come from NASA's [Webb image gallery](https://science.nasa.gov/mission/webb/multimedia/images/) on science.nasa.gov, credited to NASA, ESA, CSA and STScI. The title appears when hovering over NASA. The four classic image addresses are in [stars-20261027.js](stars-20261027.js).

## Development and status

Run `node build-20261024.cjs` to rebuild the single installable file. No third-party runtime libraries are required.

This is an early release. Discord's internal message-loading interface and CSS classes may change; failures are shown instead of silently reporting a successful import. Layout, category editing, pagination, deduplication, cancellation and cleanup are tested with local fixtures. Live Discord import compatibility must also be checked on the installed client.

The dated `.plugin.js` filename is required for BetterDiscord loading. `README.md` keeps GitHub's recognized documentation filename.
