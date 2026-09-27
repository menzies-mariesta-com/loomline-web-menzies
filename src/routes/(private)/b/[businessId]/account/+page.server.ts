import type { Actions, PageServerLoad } from './$types';
import { accountPageActions, loadAccountPage } from '#lib/server/account-page';

export const load: PageServerLoad = async ({ locals }) => loadAccountPage(locals);

export const actions: Actions = accountPageActions;
