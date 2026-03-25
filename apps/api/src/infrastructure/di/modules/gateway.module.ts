import { ContainerModule } from "inversify";
import { AudioProviderEnum } from "@/domain/enums/audio-provider.enum.ts";
import { AudioProviderPort } from "@/domain/ports/audio-provider.port.ts";
import { CachePort } from "@/domain/ports/cache.port.ts";
import { McpClientPort } from "@/domain/ports/mcp-client.port.ts";
import { N8nClientPort } from "@/domain/ports/n8n-client.port.ts";
import { N8nWorkflowStoragePort } from "@/domain/ports/n8n-workflow-storage.port.ts";
import { RealtimeGatewayPort } from "@/domain/ports/realtime-gateway.port.ts";
import { SecretManagerPort } from "@/domain/ports/secret-manager.port.ts";
import { TelephonyGatewayPort } from "@/domain/ports/telephony-gateway.port.ts";
import { TwilioClientPort } from "@/domain/ports/twilio-client.port.ts";
import { VoicePreviewPort } from "@/domain/ports/voice-preview.port.ts";
import { WhatsAppClientPort } from "@/domain/ports/whatsapp-client.port.ts";
import { GrokAudioProviderAdapter } from "@/infrastructure/audio-providers/grok-audio-provider.adapter.ts";
import { GrokVoicePreviewAdapter } from "@/infrastructure/audio-providers/grok-voice-preview.adapter.ts";
import { OpenAIAudioProviderAdapter } from "@/infrastructure/audio-providers/openai-audio-provider.adapter.ts";
import { OpenAIVoicePreviewAdapter } from "@/infrastructure/audio-providers/openai-voice-preview.adapter.ts";
import { InMemoryCacheAdapter } from "@/infrastructure/cache/in-memory-cache.adapter.ts";
import { RedisCacheAdapter } from "@/infrastructure/cache/redis-cache.adapter.ts";
import { env } from "@/infrastructure/config/env.ts";
import { RealtimeAudioGateway } from "@/infrastructure/gateway/realtime-audio.gateway.ts";
import { McpClientAdapter } from "@/infrastructure/mcp/mcp-client.adapter.ts";
import { N8nClientAdapter } from "@/infrastructure/n8n/n8n-client.adapter.ts";
import { N8nWorkflowFileStorageAdapter } from "@/infrastructure/n8n/n8n-workflow-file-storage.adapter.ts";
import { InfisicalSecretAdapter } from "@/infrastructure/secret/infisical-secret.adapter.ts";
import { TwilioClientAdapter } from "@/infrastructure/telephony/twilio-client.adapter.ts";
import { TwilioMediaGateway } from "@/infrastructure/telephony/twilio-media.gateway.ts";
import { MetaWhatsAppClientAdapter } from "@/infrastructure/whatsapp/meta-whatsapp-client.adapter.ts";

export const gatewayModule = new ContainerModule((module) => {
  // Audio provider — conditional based on AUDIO_PROVIDER env var
  const audioProvider = env.get("AUDIO_PROVIDER");
  if (audioProvider === AudioProviderEnum.OPENAI) {
    module
      .bind(AudioProviderPort)
      .to(OpenAIAudioProviderAdapter)
      .inSingletonScope();
    module
      .bind(VoicePreviewPort)
      .to(OpenAIVoicePreviewAdapter)
      .inSingletonScope();
  } else {
    module
      .bind(AudioProviderPort)
      .to(GrokAudioProviderAdapter)
      .inSingletonScope();
    module
      .bind(VoicePreviewPort)
      .to(GrokVoicePreviewAdapter)
      .inSingletonScope();
  }

  module.bind(RealtimeGatewayPort).to(RealtimeAudioGateway).inSingletonScope();
  module.bind(McpClientPort).to(McpClientAdapter).inSingletonScope();
  module.bind(SecretManagerPort).to(InfisicalSecretAdapter).inSingletonScope();
  module.bind(N8nClientPort).to(N8nClientAdapter).inSingletonScope();
  module
    .bind(N8nWorkflowStoragePort)
    .to(N8nWorkflowFileStorageAdapter)
    .inSingletonScope();
  module.bind(TelephonyGatewayPort).to(TwilioMediaGateway).inSingletonScope();
  module.bind(TwilioClientPort).to(TwilioClientAdapter).inSingletonScope();
  module
    .bind(WhatsAppClientPort)
    .to(MetaWhatsAppClientAdapter)
    .inSingletonScope();

  // Cache — Redis if REDIS_URL is set, otherwise in-memory fallback
  if (env.get("REDIS_URL")) {
    module.bind(CachePort).to(RedisCacheAdapter).inSingletonScope();
  } else {
    module.bind(CachePort).to(InMemoryCacheAdapter).inSingletonScope();
  }
});
