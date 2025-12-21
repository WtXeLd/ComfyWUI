"""
Automatic prompt and image node detection for ComfyUI workflows
"""
from typing import Any


class PromptNodeDetector:
    """Detector for finding prompt input nodes in ComfyUI workflows"""

    @staticmethod
    def detect_prompt_nodes(workflow: dict[str, Any]) -> list[str]:
        """
        Detect prompt nodes in ComfyUI workflow.
        Returns list of node IDs, sorted by priority (most likely first).

        Args:
            workflow: ComfyUI workflow dictionary

        Returns:
            list: List of node IDs sorted by priority (highest first)
        """
        candidates = []

        for node_id, node_data in workflow.items():
            if not isinstance(node_data, dict):
                continue

            # Check if it's a CLIPTextEncode node
            if node_data.get("class_type") == "CLIPTextEncode":
                # Check if it has text input
                inputs = node_data.get("inputs", {})
                if "text" in inputs:
                    priority = PromptNodeDetector._calculate_priority(node_id, node_data)
                    candidates.append((priority, node_id))

        # Sort by priority (higher = better)
        candidates.sort(reverse=True, key=lambda x: x[0])

        return [node_id for _, node_id in candidates]

    @staticmethod
    def _calculate_priority(node_id: str, node_data: dict[str, Any]) -> float:
        """
        Calculate priority score for prompt node.
        Higher score = more likely to be the main prompt.

        Args:
            node_id: Node ID
            node_data: Node data dictionary

        Returns:
            float: Priority score
        """
        score = 0.0

        # Check node title/metadata
        meta = node_data.get("_meta", {})
        if meta and "title" in meta:
            title = meta["title"].lower()

            # Positive indicators
            if "prompt" in title:
                score += 10
            if "positive" in title:
                score += 8
            if "text" in title and "encode" in title:
                score += 5
            if "主" in title or "正面" in title:  # Chinese: main/positive
                score += 8

            # Negative indicators
            if "negative" in title:
                score -= 10
            if "负面" in title:  # Chinese: negative
                score -= 10
            if "condition" in title and "zero" in title:
                score -= 5

        # Prefer lower node IDs (usually created first, often the main prompt)
        try:
            node_num = int(node_id)
            # Lower IDs get slight boost (max 5 points for ID 1, decreasing)
            score += max(0, 5 - (node_num * 0.1))
        except ValueError:
            pass

        return score

    @staticmethod
    def get_prompt_text(workflow: dict[str, Any], node_id: str) -> str | None:
        """
        Get the prompt text from a specific node

        Args:
            workflow: ComfyUI workflow dictionary
            node_id: Node ID to get prompt from

        Returns:
            str | None: Prompt text or None if not found
        """
        node = workflow.get(node_id)
        if not node:
            return None

        inputs = node.get("inputs", {})
        return inputs.get("text")

    @staticmethod
    def set_prompt_text(workflow: dict[str, Any], node_id: str, prompt: str) -> dict[str, Any]:
        """
        Set the prompt text in a specific node

        Args:
            workflow: ComfyUI workflow dictionary
            node_id: Node ID to set prompt in
            prompt: New prompt text

        Returns:
            dict: Modified workflow
        """
        if node_id in workflow:
            if "inputs" not in workflow[node_id]:
                workflow[node_id]["inputs"] = {}
            workflow[node_id]["inputs"]["text"] = prompt

        return workflow


class ImageNodeDetector:
    """Detector for finding image input nodes in ComfyUI workflows"""

    @staticmethod
    def detect_image_nodes(workflow: dict[str, Any]) -> list[str]:
        """
        Detect image input nodes in ComfyUI workflow.
        Returns list of node IDs, sorted by priority (most likely first).

        Args:
            workflow: ComfyUI workflow dictionary

        Returns:
            list: List of node IDs sorted by priority (highest first)
        """
        candidates = []

        for node_id, node_data in workflow.items():
            if not isinstance(node_data, dict):
                continue

            # Check if it's a LoadImage node
            if node_data.get("class_type") == "LoadImage":
                # Check if it has image input
                inputs = node_data.get("inputs", {})
                if "image" in inputs:
                    priority = ImageNodeDetector._calculate_priority(node_id, node_data)
                    candidates.append((priority, node_id))

        # Sort by priority (higher = better)
        candidates.sort(reverse=True, key=lambda x: x[0])

        return [node_id for _, node_id in candidates]

    @staticmethod
    def _calculate_priority(node_id: str, node_data: dict[str, Any]) -> float:
        """
        Calculate priority score for image node.
        Higher score = more likely to be the main image input.

        Args:
            node_id: Node ID
            node_data: Node data dictionary

        Returns:
            float: Priority score
        """
        score = 0.0

        # Check node title/metadata
        meta = node_data.get("_meta", {})
        if meta and "title" in meta:
            title = meta["title"].lower()

            # Positive indicators
            if "input" in title:
                score += 10
            if "load" in title and "image" in title:
                score += 8
            if "main" in title or "primary" in title:
                score += 8
            if "输入" in title or "加载" in title:  # Chinese: input/load
                score += 8

            # Negative indicators (controlnet, reference, etc.)
            if "control" in title or "reference" in title:
                score -= 5
            if "参考" in title or "控制" in title:  # Chinese: reference/control
                score -= 5

        # Prefer lower node IDs (usually created first, often the main input)
        try:
            node_num = int(node_id.split(':')[-1]) if ':' in node_id else int(node_id)
            # Lower IDs get slight boost
            score += max(0, 5 - (node_num * 0.1))
        except ValueError:
            pass

        return score

    @staticmethod
    def get_image_filename(workflow: dict[str, Any], node_id: str) -> str | None:
        """
        Get the image filename from a specific node

        Args:
            workflow: ComfyUI workflow dictionary
            node_id: Node ID to get image from

        Returns:
            str | None: Image filename or None if not found
        """
        node = workflow.get(node_id)
        if not node:
            return None

        inputs = node.get("inputs", {})
        return inputs.get("image")

    @staticmethod
    def set_image_filename(workflow: dict[str, Any], node_id: str, filename: str) -> dict[str, Any]:
        """
        Set the image filename in a specific node

        Args:
            workflow: ComfyUI workflow dictionary
            node_id: Node ID to set image in
            filename: New image filename

        Returns:
            dict: Modified workflow
        """
        if node_id in workflow:
            if "inputs" not in workflow[node_id]:
                workflow[node_id]["inputs"] = {}
            workflow[node_id]["inputs"]["image"] = filename

        return workflow
