import type { User } from './auth';

export type * from './auth';
export type * from './navigation';
export type * from './ui';

export type SharedData = {
    name: string;
    auth: {
        user: User | null;
    };
    sidebarOpen?: boolean;
    [key: string]: unknown;
};

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & SharedData;
