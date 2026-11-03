export const MENZIES_WEBSITE_URL = 'https://menzies.mariesta.com/';

/** HTML email anchor: same ink as surrounding text, no underline. */
export function menziesEmailLinkHtml(color: string): string {
	return `<a href="${MENZIES_WEBSITE_URL}" style="color:${color};text-decoration:none;">Menzies</a>`;
}
