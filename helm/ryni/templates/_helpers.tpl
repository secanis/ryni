{{/*
Expand the name of the chart.
*/}}
{{- define "ryni.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some K8s name fields are limited to this (RFC 1123).
*/}}
{{- define "ryni.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the ServiceAccount to use.
*/}}
{{- define "ryni.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "ryni.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
Common labels (applied to every resource).
*/}}
{{- define "ryni.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "ryni.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels (used in matchLabels; must be stable across upgrades).
*/}}
{{- define "ryni.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ryni.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Component-specific selector labels.
*/}}
{{- define "ryni.pocketbase.selectorLabels" -}}
{{ include "ryni.selectorLabels" . }}
app.kubernetes.io/component: pocketbase
{{- end -}}

{{- define "ryni.frontend.selectorLabels" -}}
{{ include "ryni.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end -}}

{{/*
PocketBase fullname helpers (for resources that need a stable name).
*/}}
{{- define "ryni.pocketbase.fullname" -}}
{{- printf "%s-pocketbase" (include "ryni.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ryni.frontend.fullname" -}}
{{- printf "%s-frontend" (include "ryni.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
PB Secret name (auto-generated one).
*/}}
{{- define "ryni.pocketbase.secretName" -}}
{{- if .Values.pocketbase.secret.existingSecret -}}
{{- .Values.pocketbase.secret.existingSecret -}}
{{- else -}}
{{- include "ryni.pocketbase.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Default superuser credentials Secret name. Skipped when the operator
brings their own Secret via pocketbase.superuser.existingSecret.
*/}}
{{- define "ryni.pocketbase.superuserSecretName" -}}
{{- if .Values.pocketbase.superuser.existingSecret -}}
{{- .Values.pocketbase.superuser.existingSecret -}}
{{- else -}}
{{- include "ryni.pocketbase.fullname" . }}-superuser
{{- end -}}
{{- end -}}
