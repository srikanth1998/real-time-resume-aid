#ifndef OPUS_H
#define OPUS_H

// Dummy Opus header - replace with real implementation
typedef struct OpusEncoder OpusEncoder;
typedef struct OpusDecoder OpusDecoder;

#define OPUS_OK 0
#define OPUS_APPLICATION_VOIP 2048
#define OPUS_SET_BITRATE_REQUEST 4002
#define OPUS_SET_COMPLEXITY_REQUEST 4010
#define OPUS_SET_SIGNAL_REQUEST 4024
#define OPUS_SIGNAL_VOICE 3001

// Dummy function declarations
#ifdef __cplusplus
extern "C" {
#endif

OpusEncoder *opus_encoder_create(int Fs, int channels, int application, int *error);
int opus_encode_float(OpusEncoder *st, const float *pcm, int frame_size, unsigned char *data, int max_data_bytes);
int opus_encoder_ctl(OpusEncoder *st, int request, ...);
void opus_encoder_destroy(OpusEncoder *st);

#ifdef __cplusplus
}
#endif

#endif