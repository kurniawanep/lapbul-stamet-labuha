<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $gatewayUrl;
    protected ?string $apiKey;
    protected string $defaultSession;

    public function __construct()
    {
        $gatewayUrl = config('services.whatsapp.gateway_url', env('WHATSAPP_GATEWAY_URL', 'http://localhost:3000'));
        $this->gatewayUrl = rtrim((string) ($gatewayUrl ?: ''), '/');
        $this->apiKey = config('services.whatsapp.api_key', env('WHATSAPP_API_KEY'));
        $this->defaultSession = config('services.whatsapp.session', env('WHATSAPP_SESSION', 'default')) ?: 'default';
    }

    /**
     * Check if WhatsApp Gateway configuration is present.
     */
    public function isConfigured(): bool
    {
        return !empty($this->gatewayUrl);
    }

    /**
     * Send text message to a specific phone number or chat JID.
     */
    public function sendMessage(string $to, string $message): bool
    {
        if (!$this->isConfigured()) {
            Log::warning("WhatsAppService: Gateway URL not configured.");
            return false;
        }

        try {
            $request = Http::timeout(10)->contentType('application/json');
            if ($this->apiKey) {
                $request->withHeaders(['X-Api-Key' => $this->apiKey]);
            }

            // Target endpoint for WAHA / Baileys Node gateway
            $response = $request->post("{$this->gatewayUrl}/api/sendText", [
                'session' => $this->defaultSession,
                'chatId' => $this->formatChatId($to),
                'text' => $message,
            ]);

            if ($response->successful()) {
                Log::info("WhatsApp message sent successfully to {$to}");
                return true;
            }

            Log::error("WhatsApp API Error", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error("WhatsAppService Exception: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send message to a WhatsApp group.
     */
    public function sendGroupMessage(string $groupId, string $message): bool
    {
        $chatId = str_contains($groupId, '@g.us') ? $groupId : "{$groupId}@g.us";
        return $this->sendMessage($chatId, $message);
    }

    /**
     * Get live connection status and QR code (if disconnected) from WA Gateway.
     */
    public function getStatus(): array
    {
        if (!$this->isConfigured()) {
            return [
                'configured' => false,
                'connected' => false,
                'user' => null,
                'qr' => null,
                'gateway_url' => $this->gatewayUrl,
                'message' => 'WHATSAPP_GATEWAY_URL belum dikonfigurasi',
            ];
        }

        try {
            $request = Http::timeout(5)->contentType('application/json');
            if ($this->apiKey) {
                $request->withHeaders(['X-Api-Key' => $this->apiKey]);
            }

            $response = $request->get("{$this->gatewayUrl}/api/qr");

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'configured' => true,
                    'connected' => (bool) ($data['connected'] ?? false),
                    'user' => $data['user'] ?? null,
                    'qr' => $data['qr'] ?? null,
                    'gateway_url' => $this->gatewayUrl,
                    'message' => ($data['connected'] ?? false) ? 'WhatsApp Connected & Active' : 'Waiting for QR Code Scan',
                ];
            }

            return [
                'configured' => true,
                'connected' => false,
                'user' => null,
                'qr' => null,
                'gateway_url' => $this->gatewayUrl,
                'message' => 'Gagal terhubung ke WA Gateway HTTP API',
            ];
        } catch (\Exception $e) {
            return [
                'configured' => true,
                'connected' => false,
                'user' => null,
                'qr' => null,
                'gateway_url' => $this->gatewayUrl,
                'message' => 'Error koneksi Gateway: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Trigger logout session on WA Gateway and clear auth credentials.
     */
    public function logoutSession(): array
    {
        if (!$this->isConfigured()) {
            return ['success' => false, 'message' => 'Gateway URL not configured'];
        }

        try {
            $request = Http::timeout(10)->contentType('application/json');
            if ($this->apiKey) {
                $request->withHeaders(['X-Api-Key' => $this->apiKey]);
            }

            $response = $request->post("{$this->gatewayUrl}/api/logout");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => $response->json('message') ?? 'Sesi WhatsApp berhasil di-logout',
                ];
            }

            return [
                'success' => false,
                'message' => 'Gagal logout dari Gateway (Status ' . $response->status() . ')',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception logout: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Format recipient string into proper WhatsApp JID.
     */
    protected function formatChatId(string $to): string
    {
        if (str_contains($to, '@g.us') || str_contains($to, '@c.us')) {
            return $to;
        }

        // Clean phone number
        $cleaned = preg_replace('/[^0-9]/', '', $to);
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '62' . substr($cleaned, 1);
        }

        return "{$cleaned}@c.us";
    }
}
