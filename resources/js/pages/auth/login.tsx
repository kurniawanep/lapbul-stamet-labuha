import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { Mail, Lock, LogIn as LogInIcon, ShieldCheck } from 'lucide-react';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Masuk - Stasiun Meteorologi Oesman Sadik" />

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            {/* Email Input */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Alamat Email</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nama@bmkg.go.id"
                                    className="bg-slate-50/70 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-500/20 rounded-xl h-11"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Input */}
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Kata Sandi</span>
                                </Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="bg-slate-50/70 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-500/20 rounded-xl h-11"
                                />
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember Me Checkbox */}
                            <div className="flex items-center space-x-3 pt-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md"
                                />
                                <Label htmlFor="remember" className="text-xs text-slate-600 font-normal cursor-pointer select-none">
                                    Ingat saya di perangkat ini
                                </Label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-600/25 transition-all active:scale-[0.99] gap-2"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? <Spinner className="w-4 h-4 text-white" /> : <LogInIcon className="w-4 h-4" />}
                                <span>Masuk ke Sistem</span>
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs font-medium text-emerald-700 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{status}</span>
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Masuk ke Akun Pegawai',
    description: 'Silakan masukkan email dan kata sandi Anda untuk mengakses sistem LAPBUL BMKG',
};
