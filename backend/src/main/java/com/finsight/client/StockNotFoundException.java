package com.finsight.client;

public class StockNotFoundException extends RuntimeException {

    public StockNotFoundException(String ticker) {
        super("No data available for ticker '" + ticker + "'");
    }
}
