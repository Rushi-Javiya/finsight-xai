package com.finsight.client;

public class MlServiceException extends RuntimeException {

    private final boolean unavailable;

    public MlServiceException(String message, boolean unavailable, Throwable cause) {
        super(message, cause);
        this.unavailable = unavailable;
    }

    /** True when the ML service could not be reached or reported itself unavailable (HTTP 503). */
    public boolean isUnavailable() {
        return unavailable;
    }
}
