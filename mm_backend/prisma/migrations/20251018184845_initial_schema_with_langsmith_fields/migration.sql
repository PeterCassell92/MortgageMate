-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    "mortgage_scenario_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "latest_view_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "non_unique_numerical_id" INTEGER,
    "chat_id" UUID NOT NULL,
    "overall_status" VARCHAR(50) DEFAULT 'active',

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mortgage_scenarios" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "mortgage_type" VARCHAR(50),
    "monthly_payment" DECIMAL(10,2),
    "term_length" INTEGER,
    "initial_loan_size" DECIMAL(12,2),
    "overpayments" TEXT,
    "initial_house_value" DECIMAL(12,2),
    "product_cost" DECIMAL(10,2),
    "exit_fees" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "advisor_mode" VARCHAR(20) DEFAULT 'data_gathering',
    "conversation_stage" TEXT,
    "current_priority" TEXT,
    "property_location" VARCHAR(255),
    "property_type" VARCHAR(100),
    "property_value" DECIMAL(12,2),
    "property_use" VARCHAR(100),
    "current_lender" VARCHAR(255),
    "current_balance" DECIMAL(12,2),
    "current_rate" DECIMAL(5,3),
    "product_end_date" VARCHAR(50),
    "early_repayment_charges" TEXT,
    "annual_income" DECIMAL(12,2),
    "employment_status" VARCHAR(100),
    "credit_score" VARCHAR(50),
    "existing_debts" DECIMAL(12,2),
    "disposable_income" DECIMAL(12,2),
    "available_deposit" DECIMAL(12,2),
    "primary_objective" TEXT,
    "risk_tolerance" VARCHAR(50),
    "preferred_term" INTEGER,
    "payment_preference" VARCHAR(100),
    "timeline" VARCHAR(100),
    "additional_context" TEXT,
    "documents_summary" TEXT,

    CONSTRAINT "mortgage_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER,
    "from_user" VARCHAR(255) NOT NULL,
    "to_user" VARCHAR(255) NOT NULL,
    "message_body" TEXT NOT NULL,
    "sent_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "received_time" TIMESTAMP(6),
    "llm_request_id" INTEGER,
    "llm_response_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analyses" (
    "id" SERIAL NOT NULL,
    "mortgage_scenario_id" INTEGER,
    "prompt_sent" TEXT,
    "llm_response" TEXT,
    "analysis_results" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."llm_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "chat_id" INTEGER,
    "url" VARCHAR(500) NOT NULL,
    "http_method" VARCHAR(10) NOT NULL DEFAULT 'POST',
    "request_body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inprocess',
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "start_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "finish_time" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "system_prompt" TEXT,
    "user_message" TEXT,
    "temperature" DECIMAL(3,2),
    "max_tokens" INTEGER,
    "implementation_mode" VARCHAR(20) DEFAULT 'legacy',
    "run_id" UUID,
    "parent_run_id" UUID,
    "error_message" TEXT,
    "error_type" VARCHAR(100),
    "tags" TEXT,
    "metadata" TEXT,

    CONSTRAINT "llm_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."llm_responses" (
    "id" SERIAL NOT NULL,
    "llm_request_id" INTEGER,
    "response_totality" TEXT NOT NULL,
    "input_tokens" INTEGER DEFAULT 0,
    "output_tokens" INTEGER DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "estimated_cost" DECIMAL(10,6) DEFAULT 0.00,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "latency_ms" INTEGER,
    "finish_reason" VARCHAR(50),

    CONSTRAINT "llm_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "chats_chat_id_key" ON "public"."chats"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "chats_user_numerical_id_unique" ON "public"."chats"("user_id", "non_unique_numerical_id");

-- CreateIndex
CREATE UNIQUE INDEX "llm_requests_run_id_key" ON "public"."llm_requests"("run_id");

-- AddForeignKey
ALTER TABLE "public"."chats" ADD CONSTRAINT "chats_mortgage_scenario_id_fkey" FOREIGN KEY ("mortgage_scenario_id") REFERENCES "public"."mortgage_scenarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."chats" ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."mortgage_scenarios" ADD CONSTRAINT "mortgage_scenarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_llm_request_id_fkey" FOREIGN KEY ("llm_request_id") REFERENCES "public"."llm_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_llm_response_id_fkey" FOREIGN KEY ("llm_response_id") REFERENCES "public"."llm_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."analyses" ADD CONSTRAINT "analyses_mortgage_scenario_id_fkey" FOREIGN KEY ("mortgage_scenario_id") REFERENCES "public"."mortgage_scenarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."llm_requests" ADD CONSTRAINT "llm_requests_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."llm_requests" ADD CONSTRAINT "llm_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."llm_responses" ADD CONSTRAINT "llm_responses_llm_request_id_fkey" FOREIGN KEY ("llm_request_id") REFERENCES "public"."llm_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
