import { defineEnvVars } from '@sveltejs/kit/env';

const optionalString = {
	description: 'Optional.',
	schema: (value: string | undefined) => value
};

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:4001`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy.'
	},
	SEED_PLATFORM_ADMIN_EMAIL: {
		description: 'Email for seeded platform admin.',
		...optionalString
	},
	SEED_PLATFORM_ADMIN_PASSWORD: {
		description: 'Password for seeded platform admin.',
		...optionalString
	},
	TWILIO_ACCOUNT_SID: { description: 'Twilio account SID.', ...optionalString },
	TWILIO_AUTH_TOKEN: { description: 'Twilio auth token.', ...optionalString },
	TWILIO_FROM_SMS: { description: 'Twilio SMS from number.', ...optionalString },
	CRON_SECRET: { description: 'Shared secret for cron/outbox endpoints.', ...optionalString },
	SMTP_HOST: { description: 'SMTP host for email invites.', ...optionalString },
	SMTP_PORT: { description: 'SMTP port.', ...optionalString },
	SMTP_USER: { description: 'SMTP user.', ...optionalString },
	SMTP_PASS: { description: 'SMTP password.', ...optionalString },
	SMTP_FROM: { description: 'SMTP from address.', ...optionalString },
	TRIAL_REQUEST_INBOX: {
		description:
			'Inbox for pricing trial request notifications (default: zarnihlawn@outlook.com).',
		...optionalString
	},
	S3_ACCESS_KEY_ID: {
		description: 'Neon Object Storage (S3) access key id.',
		...optionalString
	},
	S3_SECRET_ACCESS_KEY: {
		description: 'Neon Object Storage (S3) secret access key.',
		...optionalString
	},
	S3_REGION: { description: 'Neon Object Storage region.', ...optionalString },
	AWS_ENDPOINT_URL_S3: {
		description: 'Neon Object Storage S3 endpoint URL.',
		...optionalString
	},
	ORG_IMAGE_BUCKET: {
		description: 'S3 bucket name for org images (default: uploads).',
		...optionalString
	},
	UPSTASH_REDIS_REST_URL: {
		description: 'Upstash Redis REST URL (optional; in-memory cache when omitted).',
		...optionalString
	},
	UPSTASH_REDIS_REST_TOKEN: {
		description: 'Upstash Redis REST token.',
		...optionalString
	},
	CACHE_DEBUG: {
		description: 'Set to 1 to log cache hit/miss.',
		...optionalString
	}
});
