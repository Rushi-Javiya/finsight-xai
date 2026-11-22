package com.finsight;

import static org.assertj.core.api.Assertions.assertThat;

import com.finsight.client.MlServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest
class FinsightApplicationTests {

    @Autowired
    private ApplicationContext context;

    @Test
    void contextLoadsWithRealWiring() {
        assertThat(context.getBean(MlServiceClient.class)).isNotNull();
    }
}
