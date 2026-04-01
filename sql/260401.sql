ALTER TABLE club 
    ADD COLUMN affiliation_type character varying NOT NULL DEFAULT '',
    ADD COLUMN college_major_id integer;

ALTER TABLE college_major ALTER COLUMN major DROP NOT NULL;

INSERT INTO college_major (college, major)
SELECT college, NULL
FROM college_major
GROUP BY college
HAVING COUNT(*) > 1;

UPDATE club
SET affiliation_type = CASE 
    WHEN college IN ('단과대무관', '법과대학') THEN '기타'
    WHEN college = '연합동아리' THEN '연합동아리'
    WHEN college = '중앙동아리' THEN '중앙동아리'
    ELSE '소속동아리'
END;