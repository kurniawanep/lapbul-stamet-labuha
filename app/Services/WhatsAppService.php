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
        $this->gatewayUrl = config('services.whatsapp.gateway_url', env('WHATSAPP_GATEWAY_URL', 'http://localhost:3000'));
        $this->apiKey = config('services.whatsapp.api_key', env('WHATSAPP_API_KEY', null));
        $this->defaultSession = config('services.whatsapp.session', env('WHATSAPP_SESSION', 'default'));
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
