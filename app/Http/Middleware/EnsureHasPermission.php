<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // If no specific permission passed or user has one of required permissions
        if (empty($permissions) || $user->hasPermission($permissions)) {
            return $next($request);
        }

        abort(403, 'Anda tidak memiliki hak akses untuk mengakses halaman atau aksi ini.');
    }
}
