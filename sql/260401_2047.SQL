ALTER TABLE club 
    ADD COLUMN affiliation_type character varying NOT NULL DEFAULT '',
    ADD COLUMN college_major_id integer;

ALTER TABLE college_major ALTER COLUMN major DROP NOT NULL;

INSERT INTO college_major (college, major)
SELECT college, NULL
FROM college_major
GROUP BY college
HAVING COUNT(*) > 1;