export const copyToClipboard = (text: string) => {
    const clipboard = window?.navigator.clipboard

    return clipboard.writeText(text);
}