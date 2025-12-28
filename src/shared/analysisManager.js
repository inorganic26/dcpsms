// src/shared/analysisManager.js

import { createDailyTestManager } from "./analysis/dailyTestManager.js";
import { createWeeklyTestManager } from "./analysis/weeklyTestManager.js";
import { createLearningStatusManager } from "./analysis/learningStatusManager.js";

/**
 * 분석 기능 통합 매니저 (Facade Pattern)
 * 모든 분석/테스트 관련 로직을 기능별로 분리된 하위 매니저들에게 위임합니다.
 */
export const createAnalysisManager = (config) => {
    // 1. 일일 테스트 매니저 생성
    const daily = createDailyTestManager(config);
    
    // 2. 주간 테스트 매니저 생성
    const weekly = createWeeklyTestManager(config);
    
    // 3. 학습 현황 매니저 생성
    const learning = createLearningStatusManager(config);

    // 모든 기능을 하나의 객체로 합쳐서 반환
    return {
        ...daily,
        ...weekly,
        ...learning
    };
};