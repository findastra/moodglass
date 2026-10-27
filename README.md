# Moodglass

Turn your Discord photo chats into backgrounds. Click **✎**, then add a channel with **+**, then click its button for a new, edge-to-edge mosaic. **✎** toggles inline editing above the category buttons. NASA is an optional built-in category with one full-window James Webb image.

## Install

1. Install BetterDiscord from [betterdiscord.app](https://betterdiscord.app/).
2. Download [moodglass-20261024.plugin.js](https://github.com/findastra/moodglass/releases/latest/download/moodglass-20261024.plugin.js). It saves straight to your Downloads folder.
3. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**. Put the downloaded file there and enable **Moodglass**.
4. Click **✎** at the top right, then **+**. Click a chat in Discord, or navigate to it and choose **Use this open chat**.

If upgrading from the earlier Astra Mood Boards / Astra NASA Photos prototypes, disable both before enabling Moodglass.

## Use

- **Channel buttons:** reconcile that channel's accessible photo history and choose a new mosaic. Each click reads all pages, adds new photos, and removes deleted attachments from the background selection. An empty photo chat clears the background. Failed refreshes keep the previous selection and show an error.
- **+**: add a server text channel, direct-message chat, or individual thread that your Discord client can access. For forums, add an individual post.
- **✎**: show circular minus controls above the categories and reveal **+**. Click a minus to remove that category; click the pencil again to finish. Removal does not delete Discord posts or cached files. A removed NASA category can be restored through **+ → Add NASA**.
- **NASA**: rotate through four verified, full-resolution Webb color images: Cosmic Cliffs, Rho Ophiuchi, and two views of the Pillars of Creation. NASA fills the window with one image and no global dimming filter.
- **Blurred borders:** use the checkbox at the top to blend photo edges or show crisp borders. The choice is saved and applies immediately without loading different photos. Enabled by default.
- **Resize:** the current photos rearrange without changing. Mosaic tiles crop to fill their space, with no gaps or repeated image content in a layout.

No timed slideshow or background channel polling. A click starts a finite import; removing the category cancels its import. Large histories and Webb originals can take time to download.

## What is stored

Only image attachments from chats you explicitly add are imported. The plugin stores image files in `moodglass-cache` inside your BetterDiscord plugins directory, and channel IDs, category labels, attachment IDs and image hashes in BetterDiscord's local data storage. It does not save message text, read account tokens, send messages, or upload photos. Your personal channels, images and configuration are not part of this repository or download.

PNG, JPEG, WebP, GIF and AVIF attachments up to 64 MB are supported. External image embeds and linked web galleries are not imported. Deleted attachments are removed from the selectable library after a successful refresh; downloaded files remain on disk. Removing a category keeps its cache for re-adding later.

## Webb sources and credits

Images are downloaded directly from NASA's [Webb image gallery](https://science.nasa.gov/mission/webb/multimedia/images/), credited to NASA, ESA, CSA and STScI. Titles and credits appear when hovering over the category controls. Sources and full original image URLs are in [webb-20261024.js](webb-20261024.js). These infrared color composites use the published scientific image processing, with no added saturation or blur.

## Development and status

Run `node build-20261024.cjs` to rebuild the single installable file. No third-party runtime libraries are required.

This is an early release. Discord's internal message-loading interface and CSS classes may change; failures are shown instead of silently reporting a successful import. Layout, category editing, pagination, deduplication, cancellation and cleanup are tested with local fixtures. Live Discord import compatibility must also be checked on the installed client.

The dated `.plugin.js` filename is required for BetterDiscord loading. `README.md` keeps GitHub's recognized documentation filename.
