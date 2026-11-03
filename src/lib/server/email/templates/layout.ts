import { emailAssetUrl, emailBrand, escapeAttr, escapeHtml, siteOrigin } from '#lib/server/email/brand';
import { MENZIES_WEBSITE_URL, menziesEmailLinkHtml } from '#lib/constant/menzies';
import type { EmailCta } from '#lib/server/email/templates/types';

export type EmailLayoutOptions = {
	/** Visible H1 inside the card. */
	heading: string;
	/** Inbox preview text (hidden preheader). */
	preheader?: string;
	/** Inner HTML for the body (already escaped where needed). */
	bodyHtml: string;
	/** Optional primary button. */
	cta?: EmailCta;
	/** Soft Wash queue hero illustration under the header. Default true. */
	showHero?: boolean;
	/** Footer company line override (plain text only). */
	companyLine?: string;
};

/**
 * Soft Wash HTML email shell: mint wash background, ink wordmark, optional hero,
 * content card, CTA, footer. Table-based for common clients.
 */
export function renderEmailLayout(opts: EmailLayoutOptions): string {
	const {
		heading,
		preheader = '',
		bodyHtml,
		cta,
		showHero = true,
		companyLine = 'NextUp by Menzies. Queue and appointment operations.'
	} = opts;

	const origin = siteOrigin();
	const heroUrl = emailAssetUrl('/email/hero-queue.svg');
	const logoUrl = emailAssetUrl('/favicon-32.png');
	const { mint, mintDeep, ink, teal, navy, cream, white } = emailBrand;

	const companyLineHtml = companyLine.includes('<a ')
		? companyLine
		: escapeHtml(companyLine).replace('Menzies', menziesEmailLinkHtml(navy));

	const ctaBlock = cta
		? `<tr>
				<td align="center" style="padding:8px 0 4px;">
					<table role="presentation" cellpadding="0" cellspacing="0" border="0">
						<tr>
							<td align="center" bgcolor="${teal}" style="border-radius:10px;">
								<a href="${escapeAttr(cta.url)}"
									style="display:inline-block;padding:12px 22px;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:${white};text-decoration:none;border-radius:10px;">
									${escapeHtml(cta.label)}
								</a>
							</td>
						</tr>
					</table>
				</td>
			</tr>
			<tr>
				<td style="padding:8px 0 0;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${navy};">
					If the button does not work, open this link:<br />
					<a href="${escapeAttr(cta.url)}" style="color:${teal};word-break:break-all;">${escapeHtml(cta.url)}</a>
				</td>
			</tr>`
		: '';

	const heroBlock = showHero
		? `<tr>
				<td style="padding:0 28px 8px;">
					<img src="${escapeAttr(heroUrl)}" width="504" alt="NextUp queue illustration" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:12px;" />
				</td>
			</tr>`
		: '';

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(heading)}</title>
<!--[if mso]>
<style type="text/css">
body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style type="text/css">
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Outfit:wght@400;500;600&display=swap');
body { margin: 0 !important; padding: 0 !important; }
img { border: 0; outline: none; text-decoration: none; }
a { color: ${teal}; }
@media only screen and (max-width: 620px) {
  .email-shell { width: 100% !important; }
  .email-pad { padding-left: 16px !important; padding-right: 16px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${cream};">
${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${cream};">
	<tr>
		<td align="center" style="padding:24px 12px;">
			<table role="presentation" class="email-shell" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px;max-width:560px;background:linear-gradient(160deg, ${mint} 0%, ${white} 42%, ${cream} 100%);border:1px solid ${mintDeep};border-radius:20px;overflow:hidden;">
				<!-- Header -->
				<tr>
					<td class="email-pad" style="padding:22px 28px 12px;background-color:${mint};">
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
							<tr>
								<td valign="middle" width="36">
									<img src="${escapeAttr(logoUrl)}" width="28" height="28" alt="" style="display:block;border:0;border-radius:6px;" />
								</td>
								<td valign="middle" style="padding-left:10px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${ink};">
									<a href="${escapeAttr(origin)}" style="color:${ink};text-decoration:none;">NextUp</a>
								</td>
							</tr>
						</table>
					</td>
				</tr>
				${heroBlock}
				<!-- Content -->
				<tr>
					<td class="email-pad" style="padding:8px 28px 28px;">
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${white};border:1px solid ${mintDeep};border-radius:16px;">
							<tr>
								<td style="padding:24px 22px;">
									<h1 style="margin:0 0 14px;font-family:Fraunces,Georgia,serif;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${ink};">
										${escapeHtml(heading)}
									</h1>
									<div style="font-family:Outfit,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${ink};">
										${bodyHtml}
									</div>
									${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;"><tbody>${ctaBlock}</tbody></table>` : ''}
								</td>
							</tr>
						</table>
					</td>
				</tr>
				<!-- Footer -->
				<tr>
					<td class="email-pad" align="center" style="padding:0 28px 24px;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${navy};">
						<a href="${escapeAttr(origin)}" style="color:${teal};text-decoration:none;font-weight:500;">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a>
						<br />
						<span style="color:${navy};opacity:0.85;">${companyLineHtml}</span>
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
</body>
</html>`;
}

/** Plain-text footer shared across scenarios. */
export function textFooter(): string {
	const origin = siteOrigin();
	return `\n\n---\nNextUp\n${origin}\nNextUp by Menzies (${MENZIES_WEBSITE_URL}). Queue and appointment operations.`;
}
