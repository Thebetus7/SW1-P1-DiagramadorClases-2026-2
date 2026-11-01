package com.example.back_diagramador.document;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class ChatMessageDynamoItem {

    private Long diagramId;
    private String createdAt;
    private String id;

    private String senderType; // "USER", "COPILOT", "SYSTEM"
    private Long userId;
    private String userName;
    private String mode; // "CHAT", "EDITOR"
    private String messageType; // "CHAT_MESSAGE", "EDITOR_PROPOSAL", "PROACTIVE_SUGGESTION", "ERROR_ALERT"
    private String content;
    private String taggedUserName;

    // Propuesta de mutación serializada en JSON
    private String proposalJson;
    private String proposalStatus; // "PENDING", "ACCEPTED", "IGNORED", "EXPIRED"
    private String aiEngine; // "GEMINI_CLOUD", "WEBLLM_LOCAL"

    private Long resolvedByUserId;
    private String resolvedByUserName;
    private String resolvedAt;

    private Boolean isError;
    private String errorMessage;

    public ChatMessageDynamoItem() {
    }

    @DynamoDbPartitionKey
    @DynamoDbAttribute("diagramId")
    public Long getDiagramId() {
        return diagramId;
    }

    public void setDiagramId(Long diagramId) {
        this.diagramId = diagramId;
    }

    @DynamoDbSortKey
    @DynamoDbAttribute("createdAt")
    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    @DynamoDbSecondaryPartitionKey(indexNames = "MessageIdIndex")
    @DynamoDbAttribute("id")
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    @DynamoDbAttribute("senderType")
    public String getSenderType() {
        return senderType;
    }

    public void setSenderType(String senderType) {
        this.senderType = senderType;
    }

    @DynamoDbAttribute("userId")
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    @DynamoDbAttribute("userName")
    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    @DynamoDbAttribute("mode")
    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    @DynamoDbAttribute("messageType")
    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    @DynamoDbAttribute("content")
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    @DynamoDbAttribute("taggedUserName")
    public String getTaggedUserName() {
        return taggedUserName;
    }

    public void setTaggedUserName(String taggedUserName) {
        this.taggedUserName = taggedUserName;
    }

    @DynamoDbAttribute("proposalJson")
    public String getProposalJson() {
        return proposalJson;
    }

    public void setProposalJson(String proposalJson) {
        this.proposalJson = proposalJson;
    }

    @DynamoDbAttribute("proposalStatus")
    public String getProposalStatus() {
        return proposalStatus;
    }

    public void setProposalStatus(String proposalStatus) {
        this.proposalStatus = proposalStatus;
    }

    @DynamoDbAttribute("aiEngine")
    public String getAiEngine() {
        return aiEngine;
    }

    public void setAiEngine(String aiEngine) {
        this.aiEngine = aiEngine;
    }

    @DynamoDbAttribute("resolvedByUserId")
    public Long getResolvedByUserId() {
        return resolvedByUserId;
    }

    public void setResolvedByUserId(Long resolvedByUserId) {
        this.resolvedByUserId = resolvedByUserId;
    }

    @DynamoDbAttribute("resolvedByUserName")
    public String getResolvedByUserName() {
        return resolvedByUserName;
    }

    public void setResolvedByUserName(String resolvedByUserName) {
        this.resolvedByUserName = resolvedByUserName;
    }

    @DynamoDbAttribute("resolvedAt")
    public String getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(String resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    @DynamoDbAttribute("isError")
    public Boolean getIsError() {
        return isError;
    }

    public void setIsError(Boolean isError) {
        this.isError = isError;
    }

    @DynamoDbAttribute("errorMessage")
    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
