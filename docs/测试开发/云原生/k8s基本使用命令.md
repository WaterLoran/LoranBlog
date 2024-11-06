 Kubernetes（k8s）基本命令可以帮助管理集群、部署应用、监控资源和进行调试。以下是常用的 Kubernetes 命令及其简要说明： 

### 1. 集群信息查询
- **kubectl version**：查看客户端和服务器的 Kubernetes 版本信息。
- **kubectl cluster-info**：查看集群信息。
- **kubectl get nodes**：列出集群中的所有节点。
- **kubectl describe node [节点名]**：查看指定节点的详细信息。

### 2. Pod 操作
- **kubectl get pods -n [命名空间]**：列出指定命名空间下的所有 Pod。
- **kubectl describe pod [Pod 名称] -n [命名空间]**：查看指定命名空间下某个 Pod 的详细信息。
- **kubectl logs [Pod 名称] -n [命名空间]**：查看指定命名空间下 Pod 的日志。
- **kubectl exec -it [Pod 名称] -n [命名空间] -- /bin/bash**：进入指定命名空间下的 Pod 容器，进行交互式操作。

### 3. 部署（Deployment）管理
- **kubectl get deployments -n [命名空间]**：查看指定命名空间下的所有部署。
- **kubectl describe deployment [部署名称] -n [命名空间]**：查看指定命名空间下部署的详细信息。
- **kubectl create deployment [部署名称] --image=[镜像名称] -n [命名空间]**：在指定命名空间创建一个新的部署。
- **kubectl delete deployment [部署名称] -n [命名空间]**：删除指定命名空间下的部署。
- **kubectl scale deployment [部署名称] --replicas=[副本数] -n [命名空间]**：调整指定命名空间下部署的副本数。
- **kubectl rollout restart deployment [部署名称] -n [命名空间]**：重启指定命名空间下的部署。

### 4. 服务（Service）管理
- **kubectl get services -n [命名空间]**：查看指定命名空间下的所有服务。
- **kubectl describe service [服务名称] -n [命名空间]**：查看指定命名空间下服务的详细信息。
- **kubectl expose deployment [部署名称] --type=[类型] --port=[端口] -n [命名空间]**：为指定命名空间的部署创建一个服务。
- **kubectl delete service [服务名称] -n [命名空间]**：删除指定命名空间下的服务。

### 5. 命名空间管理
- **kubectl get namespaces**：查看所有命名空间。
- **kubectl create namespace [命名空间名称]**：创建命名空间。
- **kubectl delete namespace [命名空间名称]**：删除命名空间。

### 6. 配置文件管理
- **kubectl apply -f [文件名].yaml -n [命名空间]**：在指定命名空间根据 YAML 文件创建或更新资源。
- **kubectl delete -f [文件名].yaml -n [命名空间]**：删除指定命名空间的 YAML 文件中定义的资源。
- **kubectl edit [资源类型] [资源名称] -n [命名空间]**：编辑指定命名空间下的资源（使用默认编辑器）。

### 7. 状态检查
- **kubectl top nodes**：查看节点的资源使用情况。
- **kubectl top pods -n [命名空间]**：查看指定命名空间下 Pod 的资源使用情况。
- **kubectl get events -n [命名空间]**：查看指定命名空间中的事件，用于排查问题。

### 8. 配置管理与保密（ConfigMap & Secret）
- **kubectl get configmaps -n [命名空间]**：列出指定命名空间下的所有 ConfigMap。
- **kubectl create configmap [ConfigMap 名称] --from-literal=[键]=[值] -n [命名空间]**：在指定命名空间创建 ConfigMap。
- **kubectl get secrets -n [命名空间]**：列出指定命名空间下的所有 Secret。
- **kubectl create secret generic [Secret 名称] --from-literal=[键]=[值] -n [命名空间]**：在指定命名空间创建 Secret。

### 9. 其他实用命令
- **kubectl get all -n [命名空间]**：查看指定命名空间下的所有资源。
- **kubectl describe [资源类型] [资源名称] -n [命名空间]**：查看指定命名空间下的资源详细信息（适用于所有资源类型，如 Pod、Deployment、Service 等）。
- **kubectl config view**：查看当前的 kubeconfig 文件内容。
- **kubectl config use-context [上下文名称]**：切换 Kubernetes 上下文。

添加命名空间可以更准确地指定资源的作用范围，确保在多命名空间环境中操作准确无误。