'use server';

import { redirect } from 'next/navigation';
import { logIn, signUp } from '@/lib/accounts';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import * as repo from '@/lib/repo';
import { categorySchema, idSchema, itemSchema, settingsSchema } from '@/lib/schemas';
import { clearSession, clientIp, requireOwner, setSession } from '@/lib/session';

const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

const HOUR = 3_600_000;

export async function signupAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 5, HOUR).ok) redirect('/signup?error=rate');
  const result = signUp(getDb(), {
    email: str(fd, 'email'),
    password: str(fd, 'password'),
    restaurantName: str(fd, 'restaurantName'),
    whatsapp: str(fd, 'whatsapp'),
  });
  if (!result.ok) {
    const code = result.error === 'invalid_input' ? `invalid_${result.field ?? ''}` : result.error;
    redirect(`/signup?error=${encodeURIComponent(code)}`);
  }
  await setSession(result.userId);
  redirect('/dashboard?msg=welcome');
}

export async function loginAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  const email = str(fd, 'email').trim().toLowerCase().slice(0, 200);
  if (!rateLimit(`login-ip:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:${email}`, 5, 15 * 60_000).ok) {
    redirect('/login?error=rate');
  }
  const result = logIn(getDb(), { email, password: str(fd, 'password') });
  if (!result.ok) redirect('/login?error=invalid_credentials');
  await setSession(result.userId);
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/');
}

export async function saveSettingsAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const parsed = settingsSchema.safeParse({
    name: str(fd, 'name'),
    whatsapp: str(fd, 'whatsapp'),
    accent: str(fd, 'accent'),
  });
  if (!parsed.success) redirect('/dashboard?error=invalid_settings#reglages');
  repo.updateRestaurant(getDb(), restaurant.id, parsed.data);
  redirect('/dashboard?msg=settings_saved');
}

export async function addCategoryAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const parsed = categorySchema.safeParse({ name: str(fd, 'name'), name_ar: str(fd, 'name_ar') });
  if (!parsed.success) redirect('/dashboard?error=invalid_category');
  repo.addCategory(getDb(), restaurant.id, parsed.data);
  redirect('/dashboard?msg=category_added');
}

export async function deleteCategoryAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.deleteCategory(getDb(), restaurant.id, id.data);
  redirect('/dashboard?msg=category_deleted');
}

export async function addItemAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const categoryId = idSchema.safeParse(fd.get('category_id'));
  const parsed = itemSchema.safeParse({
    name: str(fd, 'name'),
    name_ar: str(fd, 'name_ar'),
    description: str(fd, 'description'),
    description_ar: str(fd, 'description_ar'),
    price_cents: str(fd, 'price'),
  });
  if (!categoryId.success || !parsed.success) redirect('/dashboard?error=invalid_item');
  const result = repo.addItem(getDb(), restaurant, categoryId.data, parsed.data);
  if (!result.ok) redirect(`/dashboard?error=${result.error}`);
  redirect('/dashboard?msg=item_added');
}

export async function updateItemAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  const parsed = itemSchema.safeParse({
    name: str(fd, 'name'),
    name_ar: str(fd, 'name_ar'),
    description: str(fd, 'description'),
    description_ar: str(fd, 'description_ar'),
    price_cents: str(fd, 'price'),
  });
  if (!id.success || !parsed.success) redirect('/dashboard?error=invalid_item');
  repo.updateItem(getDb(), restaurant.id, id.data, parsed.data);
  redirect('/dashboard?msg=item_saved');
}

export async function toggleItemAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.setItemAvailable(getDb(), restaurant.id, id.data, str(fd, 'available') === '1');
  redirect('/dashboard');
}

export async function deleteItemAction(fd: FormData): Promise<void> {
  const { restaurant } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.deleteItem(getDb(), restaurant.id, id.data);
  redirect('/dashboard?msg=item_deleted');
}
